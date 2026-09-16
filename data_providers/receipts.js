const mongoose = require('mongoose');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const generatePaymentContent = require('../utils/generatePaymentContent');
const { AppError, NotFoundError, InternalError, BadRequestError, InvalidInputError, ConflictError, NoDataError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const getContractOwnerByRoomId = require('./customers').getContractOwnerByRoomId;
const { client: redis } = require('../config').redisDb;
const { receiptTypes, receiptStatus, debtStatus, sourceType, billType, PAYMENT_METHOD, DETUCTED_TYPE } = require('../constants');

const Services = require('../service');
const { calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { TaskNotiJob, NotiManagerCollectCashReceiptJob } = require('../jobs/Notifications');
const { getInvoiceStatus } = require('../service/invoices.helper');
const Roles = require('../constants/userRoles');
const { znsNewInvoiceNotiJob } = require('../jobs/ZNS/zns.job');
const { notificationJob } = require('../jobs/notification/notification.job');
const { NOTI_MANAGER_COLLECT_CASH_RECEIPT } = require('../jobs/constant/jobNames');

exports.getListReceiptPaymentStatus = async (buildingId, month, year) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	if (!month && !year) {
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		month = currentPeriod.currentMonth;
		year = currentPeriod.currentYear;
	} else {
		Number(month);
		Number(year);
	}

	const receipt = await Services.receipts.getListReceiptsPaymentStatus(buildingObjectId, month, year);

	return { period: { month, year }, listReceiptPaymentStatus: receipt?.receipts ?? [] };
};

exports.createDepositReceipt = async (roomId, buildingId, receipAmount, payerName, userId, roomVersion) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	await Services.bankAccounts.checkExistBankAccount({ buildingId: buildingObjectId });

	const roomInfo = await Services.rooms.findById(roomId).lean().exec();
	if (!roomInfo) throw new NotFoundError(`Phòng không tồn tại !`);
	if (roomInfo.version !== roomVersion) throw new ConflictError('Dữ liệu phòng đã bị thay đổi, vui lòng tải lại trang');

	const newReceipt = {
		roomObjectId: roomId,
		receiptAmount: receipAmount,
		payer: payerName,

		receiptContent: `Tiền cọc phòng ${roomInfo.roomIndex}`,
		receiptType: receiptTypes['DEPOSIT'],
		initialStatus: receiptStatus['PENDING'],
		creater: userId,
	};
	const depositReceiptCreated = await Services.receipts.createReceipt(newReceipt);

	await Services.rooms.bumpRoomVersion(roomId, roomVersion);

	const result = { _id: depositReceiptCreated._id, status: depositReceiptCreated.status };

	return result;
};

exports.createReceipt = async (data) => {
	const { roomId, receiptAmount, receiptContent, date, userId } = data;
	const roomObjectId = new mongoose.Types.ObjectId(roomId);
	const currentRoom = await Services.rooms.findById(roomObjectId).lean().exec();
	if (!currentRoom) throw new NotFoundError('Phòng không tồn tại !');

	await Services.bankAccounts.checkExistBankAccount({ buildingId: currentRoom.building });
	await Services.rooms.assertRoomWritable({ roomId, userId });

	const currentPeriod = await getCurrentPeriod(currentRoom.building);
	const contractOwner = await Services.customers.findIsContractOwnerByRoomId(roomObjectId).populate('contract').lean().exec();
	if (!contractOwner) throw new NoDataError('Phòng không tồn tại người thuê !');

	const receiptCreated = await Services.receipts.createReceipt({
		roomObjectId: roomId,
		receiptAmount: receiptAmount,
		payer: contractOwner?.fullName ?? null,
		currentPeriod: currentPeriod,
		receiptContent,
		receiptType: receiptTypes['INCIDENTAL'],
		initialStatus: receiptStatus['UNPAID'],
		date: date,
		contract: contractOwner?.contract._id,
		creater: userId,
	});

	console.log('receiptCreated: ', receiptCreated);

	await Services.rooms.bumpRoomVersionBlind(roomId);

	await znsNewInvoiceNotiJob({
		billId: receiptCreated._id,
		type: billType.RECEIPT,
	});

	return receiptCreated;
};

exports.getReceiptDetail = async (receiptId, buildingId) => {
	const receiptObjectId = new mongoose.Types.ObjectId(receiptId);

	const receipt = await Services.receipts.getReceiptAndTransDetail(receiptObjectId);

	const bankAccount = await Services.bankAccounts.findByBuildingId(buildingId).populate('bank').lean().exec();
	if (!bankAccount) throw new NotFoundError('Không tìm thấy tài khoản ngân hàng của tòa nhà !');

	const { transactions, ...receiptInfo } = receipt;
	return {
		receiptInfo,
		transactionInfo: transactions,
		paymentInfo: {
			_id: bankAccount._id,
			accountNumber: bankAccount.accountNumber,
			accountName: bankAccount.accountName,
			bank: bankAccount.bank,
		},
	};
};

exports.getDepositReceiptDetail = async (receiptId, buildingId) => {
	const receiptObjectId = new mongoose.Types.ObjectId(receiptId);
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	const receipt = await Services.receipts.getDepositReceiptDetail(receiptObjectId);
	return receipt;
};

exports.checkout = async (data) => {
	const { receiptId, amount, date, collectorInfo, version, idempotencyKey, paymentMethod } = data;

	const receiptObjectId = new mongoose.Types.ObjectId(receiptId);
	const collectorObjectId = new mongoose.Types.ObjectId(collectorInfo._id);

	const currentReceipt = await Services.receipts
		.findById(receiptObjectId)
		.populate({
			path: 'room',
			select: '_id',
			populate: {
				path: 'building',
				select: '_id',
			},
		})

		.lean()
		.exec();
	if (currentReceipt.version !== version) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	if (amount > currentReceipt.amount) throw new InvalidInputError(`Số tiền thu không hợp lệ !`);

	await Services.rooms.assertRoomWritable({ roomId: currentReceipt.room._id, userId: collectorInfo._id });

	const currentPeriod = await getCurrentPeriod(currentReceipt.room.building._id);

	let createTransaction;
	if (paymentMethod === PAYMENT_METHOD['CASH']) {
		createTransaction = await Services.transactions.createCashTransaction({
			amount: amount,
			date: date,
			type: billType['RECEIPT'],
			collectorId: collectorObjectId,
			id: receiptObjectId,
			currentPeriod,
			idempotencyKey: idempotencyKey,
			createdBy: collectorInfo.role,
		});

		//=========NOTIFICATION===============//

		if (collectorInfo.role !== Roles['OWNER']) {
			await notificationJob({
				collectorId: collectorObjectId,
				receiptId: receiptId.toString(),
				amount: amount,
				notiType: NOTI_MANAGER_COLLECT_CASH_RECEIPT,
			});
		}
	} else {
		createTransaction = await Services.transactions.generateTransferTransactionByManagement({
			amount: amount,
			idempotencyKey: idempotencyKey,
			collector: collectorObjectId,
			createdBy: collectorInfo.role,
			date,
			receipt: receiptObjectId,
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
		});
	}

	const receiptUnpaidAmount = calculateInvoiceUnpaidAmount(currentReceipt.amount, currentReceipt.paidAmount);
	const appliedAmount = Math.min(createTransaction.amount, receiptUnpaidAmount);

	const updatedTotalPaid = currentReceipt.paidAmount + createTransaction.amount;
	const newReceiptStatus = getInvoiceStatus(updatedTotalPaid, currentReceipt.amount);
	await Services.receipts.updateReceiptPaidStatusWithVersion({ receiptId, paidAmount: updatedTotalPaid, version, receiptStatus: newReceiptStatus });

	if (!!currentReceipt.detuctedInfo) {
		const { detuctedType } = currentReceipt.detuctedInfo;
		if (detuctedType === DETUCTED_TYPE['DEPOSIT_REFUND']) {
			const depositRefundInfo = await Services.depositRefunds.findByReceiptsUnpaid(receiptObjectId);
			if (!depositRefundInfo) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');

			depositRefundInfo.depositRefundAmount += appliedAmount;
			if (newReceiptStatus === receiptStatus['PAID']) {
				depositRefundInfo.receiptsUnpaid = depositRefundInfo.receiptsUnpaid.filter(
					(receipt) => receipt.toString() !== receiptObjectId.toString(),
				);
				await Services.receipts.removeDetuctedInfo(receiptObjectId);
			}
			depositRefundInfo.version += 1;
			await depositRefundInfo.save();
		}

		if (detuctedType === DETUCTED_TYPE['TERMINATE_CONTRACT_EARLY']) {
			const checkoutCost = await Services.checkoutCosts.findByReceiptUnpaidId(receiptObjectId);
			if (!checkoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại');

			checkoutCost.total -= appliedAmount;
			if (newReceiptStatus === receiptStatus['PAID']) {
				checkoutCost.receiptsUnpaid = checkoutCost.receiptsUnpaid.filter((receipt) => receipt.toString() !== receiptObjectId.toString());
				await Services.receipts.removeDetuctedInfo(receiptObjectId);
			}
			checkoutCost.version += 1;
			await checkoutCost.save();
		}
	}

	return {
		transactionId: createTransaction._id.toString(),
	};
};

exports.deleteReceipt = async (data) => {
	const { receiptId, userId, version } = data;
	const currentReceipt = await Services.receipts.findById(receiptId).lean().exec();
	if (!currentReceipt) throw new NotFoundError('Hóa đơn không tồn tại');
	if (currentReceipt.locked === true) throw new BadRequestError('Bạn không thể sửa hóa đơn đã khóa !');
	if (currentReceipt.receiptType === receiptTypes['DEPOSIT']) throw new BadRequestError('Không thể xóa hóa đơn đặt cọc !');
	if (currentReceipt.receiptType === receiptTypes['CHECKOUT']) throw new BadRequestError('Không thể xóa hóa đơn trả phòng !');
	if (currentReceipt.version !== version) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	await Services.rooms.assertRoomWritable({ roomId: currentReceipt.room, userId });

	if (currentReceipt.detuctedInfo && currentReceipt.detuctedInfo.detuctedId !== null) {
		const { detuctedInfo } = currentReceipt;
		const receiptUnpaiAmount = calculateInvoiceUnpaidAmount(currentReceipt.amount, currentReceipt.paidAmount);

		if (detuctedInfo.detuctedType === DETUCTED_TYPE['DEPOSIT_REFUND']) {
			const depositRefund = await Services.depositRefunds.findById(detuctedInfo.detuctedId);
			depositRefund.depositRefundAmount += receiptUnpaiAmount;
			depositRefund.receiptsUnpaid = depositRefund.receiptsUnpaid.filter((receipt) => receipt._id.toString() !== currentReceipt._id.toString());
			depositRefund.version += 1;
			await depositRefund.save();
		}
		if (detuctedInfo.detuctedType === DETUCTED_TYPE['TERMINATE_CONTRACT_EARLY']) {
			const checkoutCost = await Services.checkoutCosts.findById(detuctedInfo.detuctedId);
			checkoutCost.total -= receiptUnpaiAmount;
			checkoutCost.receiptsUnpaid = checkoutCost.receiptsUnpaid.filter((receipt) => receipt._id.toString() !== currentReceipt._id.toString());
			checkoutCost.version += 1;
			await checkoutCost.save();
		}
	}

	await Services.receipts.terminateReceipt(receiptId, version);
	return;
};

exports.modifyReceipt = async (data) => {
	const { receiptId, newReceiptAmount, receiptContent, date, userId, version } = data;

	const currentReceipt = await Services.receipts.findById(receiptId).lean().exec();
	if (!currentReceipt) throw new NotFoundError('Hóa đơn không tồn tại');
	if (currentReceipt.locked === true) throw new BadRequestError('Không thể sửa hóa đơn đã khóa !');
	if (currentReceipt.receiptType === receiptTypes['CHECKOUT']) throw new BadRequestError('Không thể sửa hóa đơn trả phòng !');
	if (currentReceipt.version !== version) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi, vui lòng tải lại trang !');

	await Services.rooms.assertRoomWritable({ roomId: currentReceipt.room, userId });

	const newReceiptStatus = getInvoiceStatus(currentReceipt.paidAmount, newReceiptAmount);
	const result = await Services.receipts.modifyReceipt({
		receiptObjectId: currentReceipt._id,
		receiptVersion: version,
		receiptAmount: newReceiptAmount,
		receiptContent: currentReceipt.receiptType === receiptTypes['DEPOSIT'] ? currentReceipt.receiptContent : receiptContent,
		date: date || currentReceipt.date,
		status: newReceiptStatus,
	});

	console.log('log of result from modifyReceipt: ', result);

	return result;
};

exports.createDebtsReceipt = async (data) => {
	const { roomId, receiptContent, date, userId } = data;

	const roomObjectId = new mongoose.Types.ObjectId(roomId);

	const contract = await Services.contracts.findByRoomId(roomObjectId).populate({ path: 'room', select: 'building' }).lean().exec();
	if (!contract) throw new NotFoundError('Phòng không tồn tại hợp đồng');

	await Services.bankAccounts.checkExistBankAccount({ buildingId: contract.room.building });
	await Services.rooms.assertRoomWritable({ roomId: roomId, userId });

	const currentDebts = await Services.debts.getDebts(roomObjectId);
	if (!Array.isArray(currentDebts) || currentDebts.length === 0) {
		throw new NotFoundError('Phòng không tồn tại khoản nợ');
	}

	const currentPeriod = await getCurrentPeriod(buildingObjectId);

	const formateDebts = {
		content: currentDebts
			.map((d) => d.content)
			.filter(Boolean)
			.join(', '),
		amount: currentDebts.reduce((sum, d) => sum + (d.amount || 0), 0),
	};

	console.log('log of formateDebts: ', formateDebts);
	const payer = await Services.customers.findIsContractOwnerByRoomId(roomObjectId).lean().exec();
	if (!payer) throw new NotFoundError('Phòng không tồn tại chủ hợp đồng !!!');

	const debtReceipt = await Services.receipts.createReceipt({
		roomObjectId,
		receiptAmount: formateDebts.amount,
		payer: payer.fullName,
		currentPeriod,
		receiptContent: receiptContent,
		receiptContentDetail: formateDebts.content,
		receiptType: receiptTypes['DEBTS'],
		initialStatus: receiptStatus['UNPAID'],
		date: date,
		contract: contract._id,
		creater: userId,
	});
	console.log('log of debtReceipt from createDebtsReceipt: ', debtReceipt);

	await Services.debts.closeAndSetSourceInfo({ roomId: roomObjectId, sourceId: debtReceipt._id, sourceType: sourceType['RECEIPT'] });

	return { receiptId: debtReceipt._id };
};
