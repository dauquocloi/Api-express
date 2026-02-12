const mongoose = require('mongoose');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const generatePaymentContent = require('../utils/generatePaymentContent');
const { AppError, NotFoundError, InternalError, BadRequestError, InvalidInputError, ConflictError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const getContractOwnerByRoomId = require('./customers').getContractOwnerByRoomId;
const redis = require('../config/redisClient');
const { receiptTypes, receiptStatus } = require('../constants/receipt');

const { calculateReceiptStatusAfterModified } = require('../service/receipts.helper');
const Services = require('../service');
const { calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { TaskNotiJob, NotiManagerCollectCashReceiptJob } = require('../jobs/Notifications');
const { getInvoiceStatus } = require('../service/invoices.helper');
const Roles = require('../constants/userRoles');
const { debtStatus, sourceType } = require('../constants/debts');

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

exports.createDepositReceipt = async (roomId, buildingId, receipAmount, payerName, redisKey) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const roomInfo = await Services.rooms.findById(roomId).lean().exec();
	if (!roomInfo) {
		throw new NotFoundError(`Phòng với id: ${roomId} không tồn tại !`);
	}

	const newReceipt = {
		roomObjectId: roomId,
		receiptAmount: receipAmount,
		payer: payerName,
		currentPeriod,

		receiptContent: `Tiền cọc phòng ${roomInfo.roomIndex}`,
		receiptType: receiptTypes['DEPOSIT'],
		status: receiptStatus['PENDING'],
	};
	const depositReceiptCreated = await Services.receipts.createReceipt(newReceipt, null);

	const result = { _id: depositReceiptCreated._id, status: depositReceiptCreated.status };
	await redis.set(redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);

	return result;
};

exports.createReceipt = async (roomId, buildingId, receiptAmount, receiptContent, date, userId, redisKey) => {
	let session;
	let result;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const roomObjectId = new mongoose.Types.ObjectId(roomId);
			const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

			const paymentInfo = await Services.bankAccounts.findByBuildingId(buildingId).session(session).lean().exec();
			if (!paymentInfo) throw new BadRequestError('Tòa nhà chưa có thông tin thanh toán !');

			await Services.rooms.assertRoomWritable({ roomId, userId, session: null });
			const currentPeriod = await getCurrentPeriod(buildingObjectId);
			const contractOwner = await Services.customers
				.findIsContractOwnerByRoomId(roomObjectId)
				.session(session)
				.populate('contract')
				.lean()
				.exec();

			const receiptCreated = await Services.receipts.createReceipt(
				{
					roomObjectId: roomId,
					receiptAmount: receiptAmount,
					payer: contractOwner?.fullName,
					currentPeriod: currentPeriod,
					receiptContent,
					receiptType: receiptTypes['INCIDENTAL'],
					initialStatus: receiptStatus['UNPAID'],
					date: date,
					contract: contractOwner?.contract._id,
				},

				session,
			);

			await Services.rooms.bumpRoomVersionBlind(roomId, session);
			result = receiptCreated;
			return 'Success';
		});
		await redis.set(redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
		return result;
	} catch (error) {
		await redis.set(redisKey, `FAILED:${JSON.stringify({ error: error.message })}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.getReceiptDetail = async (receiptId, buildingId) => {
	// const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);
	const receiptObjectId = new mongoose.Types.ObjectId(receiptId);

	const getReceipt = await Services.receipts.getReceiptAndTransDetail(receiptObjectId);

	return { receiptInfo: getReceipt._id, transactionInfo: getReceipt.transactionInfo, paymentInfo: null };

	// let receipt = receiptInfo[0]._id;
	// if ((receipt.status === 'unpaid' || receipt.status == 'partial') && receipt.locked === false) {
	// 	const bankInfo = await Entity.BanksEntity.findOne({ building: { $in: [buildingObjectId] } });
	// 	console.log('log of bankInfo', bankInfo);
	// 	cb(null, { receiptInfo: receipt, transactionInfo: receiptInfo[0].transactionInfo, paymentInfo: bankInfo });
	// } else {
	// 	cb(null, { receiptInfo: receipt, transactionInfo: receiptInfo[0].transactionInfo, paymentInfo: null });
	// }
};

exports.getDepositReceiptDetail = async (receiptId, buildingId) => {
	const receiptObjectId = new mongoose.Types.ObjectId(receiptId);
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	const receipt = await Services.receipts.getDepositReceiptDetail(receiptObjectId);
	return receipt;

	// if (receipts.length === 0) throw new Error(`Hóa đơn đặt cọc không tồn tại.`);

	// let receipt = receipts[0]?.receipt;
	// let transactions = receipts[0]?.transactions;
	// if ((receipt.status === 'unpaid' || receipt.status == 'partial') && receipt.locked === false) {
	// 	const bankInfo = await Entity.BanksEntity.findOne({ building: { $in: [buildingObjectId] } });
	// 	console.log('log of bankInfo', bankInfo);
	// 	cb(null, { receiptInfo: receipt, transactionInfo: transactions, paymentInfo: bankInfo });
	// } else {
	// 	cb(null, { receiptInfo: receipt, transactionInfo: transactions, paymentInfo: null });
	// }
};

// should not be used
exports.collectCashMoney = async (receiptId, buildingId, amount, date, collectorId, version, redisKey) => {
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const receiptObjectId = new mongoose.Types.ObjectId(receiptId);
		const collectorObjectId = new mongoose.Types.ObjectId(collectorId);
		const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

		const currentReceipt = await Services.receipts.findById(receiptObjectId).session(session).lean().exec();
		if (currentReceipt.version !== version) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
		if (amount > currentReceipt.amount) throw new InvalidInputError(`Số tiền thu không hợp lệ !`);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);

		const receiptUnpaidAmount = calculateInvoiceUnpaidAmount(currentReceipt.amount, currentReceipt.paidAmount);
		const createTransaction = await Services.transactions.createCashTransaction(
			{
				amount: amount,
				date: date,
				type: 'receipt',
				collectorId: collectorObjectId,
				id: receiptObjectId,
				currentPeriod,
				idempotencyKey: redisKey,
			},
			session,
		);

		const unpaidBefore = currentReceipt.amount - currentReceipt.paidAmount;
		const appliedAmount = Math.min(createTransaction.amount, unpaidBefore);

		const updatedTotalPaid = currentReceipt.paidAmount + createTransaction.amount;
		const newReceiptStatus = getInvoiceStatus(updatedTotalPaid, currentReceipt.amount);
		await Services.receipts.updateReceiptPaidStatusWithVersion(
			{ receiptId, paidAmount: updatedTotalPaid, version, receiptStatus: newReceiptStatus },
			session,
		);

		//=========update if receipt is isDepositing;=== Đoạn này nên bỏ vì khi tạo đã khóa hóa đơn.
		console.log('log of currentReceipt: ', currentReceipt);
		if (currentReceipt?.detuctedInfo) {
			const { detuctedType } = currentReceipt.detuctedInfo;
			if (detuctedType === 'depositRefund') {
				const depositRefundInfo = await Services.depositRefunds.findByReceiptsUnpaid(receiptObjectId).session(session);
				if (!depositRefundInfo) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');

				depositRefundInfo.depositRefundAmount += appliedAmount;
				if (newReceiptStatus === receiptStatus['PAID']) {
					depositRefundInfo.receiptsUnpaid = depositRefundInfo.receiptsUnpaid.filter(
						(receipt) => receipt.toString() !== receiptObjectId.toString(),
					);
					await Services.receipts.removeDetuctedInfo(receiptObjectId, session);
				}
				depositRefundInfo.version += 1;
				await depositRefundInfo.save({ session });
			}

			if (detuctedType === 'terminateContractEarly') {
				const checkoutCost = await Services.checkoutCosts.findByReceiptUnpaidId(receiptObjectId).session(session);
				if (!checkoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại');

				checkoutCost.total -= appliedAmount;
				if (newReceiptStatus === receiptStatus['PAID']) {
					checkoutCost.receiptsUnpaid = checkoutCost.receiptsUnpaid.filter((receipt) => receipt.toString() !== receiptObjectId.toString());
					await Services.receipts.removeDetuctedInfo(receiptObjectId, session);
				}
				checkoutCost.version += 1;
				await checkoutCost.save({ session });
			}
		}

		//=========NOTIFICATION===============//

		await new NotiManagerCollectCashReceiptJob().enqueue({
			collectorId: collectorObjectId,
			receiptId: receiptObjectId,
			amount: amount,
		});
		await session.commitTransaction();

		const cbData = {
			transactionId: createTransaction._id.toString(),
		};

		await redis.set(redisKey, `SUCCESS:${JSON.stringify(cbData)}`, 'EX', process.env.REDIS_EXP_SEC); //24h

		return cbData;
	} catch (error) {
		if (session) await session.abortTransaction();
		await redis.set(
			redisKey,
			JSON.stringify({
				status: 'FAILED',
				message: error.message,
			}),
			'EX',
			process.env.REDIS_EXP_SEC,
		);

		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.checkout = async (receiptId, buildingId, amount, date, collectorInfo, version, redisKey, paymentMethod) => {
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const receiptObjectId = new mongoose.Types.ObjectId(receiptId);
		const collectorObjectId = new mongoose.Types.ObjectId(collectorInfo._id);
		const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

		const currentReceipt = await Services.receipts.findById(receiptObjectId).session(session).lean().exec();
		if (currentReceipt.version !== version) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
		if (amount > currentReceipt.amount) throw new InvalidInputError(`Số tiền thu không hợp lệ !`);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);

		let createTransaction;
		if (paymentMethod === 'cash') {
			createTransaction = await Services.transactions.createCashTransaction(
				{
					amount: amount,
					date: date,
					type: 'receipt',
					collectorId: collectorObjectId,
					id: receiptObjectId,
					currentPeriod,
					idempotencyKey: redisKey,
					createdBy: collectorInfo.role,
				},
				session,
			);

			//=========NOTIFICATION===============//

			if (collectorInfo.role !== Roles['OWNER']) {
				await new NotiManagerCollectCashReceiptJob().enqueue({
					collectorId: collectorObjectId,
					receiptId: receiptObjectId,
					amount: amount,
				});
			}
		} else {
			createTransaction = await Services.transactions.generateTransferTransactionByManagement(
				{
					amount: amount,
					idempotencyKey: redisKey,
					collector: collectorObjectId,
					createdBy: collectorInfo.role,
					date,
					receipt: receiptObjectId,
					month: currentPeriod.currentMonth,
					year: currentPeriod.currentYear,
				},
				session,
			);
		}

		const receiptUnpaidAmount = calculateInvoiceUnpaidAmount(currentReceipt.amount, currentReceipt.paidAmount);
		const appliedAmount = Math.min(createTransaction.amount, receiptUnpaidAmount);

		const updatedTotalPaid = currentReceipt.paidAmount + createTransaction.amount;
		const newReceiptStatus = getInvoiceStatus(updatedTotalPaid, currentReceipt.amount);
		await Services.receipts.updateReceiptPaidStatusWithVersion(
			{ receiptId, paidAmount: updatedTotalPaid, version, receiptStatus: newReceiptStatus },
			session,
		);

		if (currentReceipt?.detuctedInfo) {
			const { detuctedType } = currentReceipt.detuctedInfo;
			if (detuctedType === 'depositRefund') {
				const depositRefundInfo = await Services.depositRefunds.findByReceiptsUnpaid(receiptObjectId).session(session);
				if (!depositRefundInfo) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');

				depositRefundInfo.depositRefundAmount += appliedAmount;
				if (newReceiptStatus === receiptStatus['PAID']) {
					depositRefundInfo.receiptsUnpaid = depositRefundInfo.receiptsUnpaid.filter(
						(receipt) => receipt.toString() !== receiptObjectId.toString(),
					);
					await Services.receipts.removeDetuctedInfo(receiptObjectId, session);
				}
				depositRefundInfo.version += 1;
				await depositRefundInfo.save({ session });
			}

			if (detuctedType === 'terminateContractEarly') {
				const checkoutCost = await Services.checkoutCosts.findByReceiptUnpaidId(receiptObjectId).session(session);
				if (!checkoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại');

				checkoutCost.total -= appliedAmount;
				if (newReceiptStatus === receiptStatus['PAID']) {
					checkoutCost.receiptsUnpaid = checkoutCost.receiptsUnpaid.filter((receipt) => receipt.toString() !== receiptObjectId.toString());
					await Services.receipts.removeDetuctedInfo(receiptObjectId, session);
				}
				checkoutCost.version += 1;
				await checkoutCost.save({ session });
			}
		}

		await session.commitTransaction();

		const cbData = {
			transactionId: createTransaction._id.toString(),
		};

		await redis.set(redisKey, `SUCCESS:${JSON.stringify(cbData)}`, 'EX', process.env.REDIS_EXP_SEC); //24h

		return cbData;
	} catch (error) {
		if (session) await session.abortTransaction();
		await redis.set(
			redisKey,
			JSON.stringify({
				status: 'FAILED',
				message: error.message,
			}),
			'EX',
			process.env.REDIS_EXP_SEC,
		);

		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.deleteReceipt = async (receiptId, userId, version) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentReceipt = await Services.receipts.findById(receiptId).session(session).lean().exec();
			if (!currentReceipt) throw new NotFoundError('Hóa đơn không tồn tại');
			if (currentReceipt.locked === true) throw new BadRequestError('Bạn không thể sửa hóa đơn đã khóa !');
			if (currentReceipt.version !== version) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
			await Services.rooms.assertRoomWritable({ roomId: currentReceipt.room, userId, session });

			if (currentReceipt.detuctedInfo && currentReceipt.detuctedInfo.detuctedId !== null) {
				const { detuctedInfo } = currentReceipt;
				const receiptUnpaiAmount = calculateInvoiceUnpaidAmount(currentReceipt.amount, currentReceipt.paidAmount);

				if (detuctedInfo.detuctedType === 'depositRefund') {
					const depositRefund = await Services.depositRefunds.findById(detuctedInfo.detuctedId).session(session);
					depositRefund.depositRefundAmount += receiptUnpaiAmount;
					depositRefund.receiptsUnpaid = depositRefund.receiptsUnpaid.filter(
						(receipt) => receipt._id.toString() !== currentReceipt._id.toString(),
					);
					depositRefund.version += 1;
					await depositRefund.save({ session });
				}
				if (detuctedInfo.detuctedType === 'terminateContractEarly') {
					const checkoutCost = await Services.checkoutCosts.findById(detuctedInfo.detuctedId).session(session);
					checkoutCost.total -= receiptUnpaiAmount;
					checkoutCost.receiptsUnpaid = checkoutCost.receiptsUnpaid.filter(
						(receipt) => receipt._id.toString() !== currentReceipt._id.toString(),
					);
					checkoutCost.version += 1;
					await checkoutCost.save({ session });
				}
			}

			const receiptUpdated = await Entity.ReceiptsEntity.findOneAndUpdate(
				{ _id: receiptId, version: version },
				{
					$set: {
						status: receiptStatus['TERMINATED'],
						locked: true,
					},
					$inc: { version: 1 },
				},
				{ session },
			);
			if (!receiptUpdated) throw new ConflictError(`Dữ liệu hóa đơn đã bị thay đổi !`);
			return;
		});
		return 'Success';
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.modifyReceipt = async (receiptId, newReceiptAmount, receiptContent, userId, redisKey) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentReceipt = await Entity.ReceiptsEntity.findOne({ _id: receiptId }).session(session);
			if (!currentReceipt) throw new NotFoundError('Hóa đơn không tồn tại');

			await Services.rooms.assertRoomWritable({ roomId: currentReceipt.room, userId, session });

			currentReceipt.amount = newReceiptAmount;
			currentReceipt.receiptContent = receiptContent;
			currentReceipt.status = calculateReceiptStatusAfterModified();
			currentReceipt.version = currentReceipt.version + 1;
			await currentReceipt.save({ session });
			return;
		});

		await redis.set(redisKey, `SUCCESS:${JSON.stringify({})}`, 'EX', process.env.REDIS_EXP_SEC);
		return 'Success';
	} catch (error) {
		await redis.set(redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.createDebtsReceipt = async (data, redisKey) => {
	let session;
	try {
		const roomObjectId = new mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);

		session = await mongoose.startSession();
		session.startTransaction();

		const contract = await Services.contracts.findByRoomId(roomObjectId).session(session).lean().exec();
		if (!contract) throw new NotFoundError('Phòng không tồn tại hợp đồng');

		const currentDebts = await Services.debts.getDebts(roomObjectId, session);
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
		const payer = await Services.customers.findIsContractOwnerByRoomId(roomObjectId).session().lean().exec();
		if (!payer) throw new NotFoundError('Phòng không tồn tại chủ hợp đồng !!!');

		const debtReceipt = await Services.receipts.createReceipt({
			roomObjectId,
			receiptAmount: formateDebts.amount,
			payer: payer.fullName,
			currentPeriod,
			receiptContent: data.receiptContent,
			receiptContentDetail: formateDebts.content,
			receiptType: receiptTypes['DEBTS'],
			initialStatus: receiptStatus['UNPAID'],
			date: data.date,
			contract: contract._id,
		});
		console.log('log of debtReceipt from createDebtsReceipt: ', debtReceipt);

		await Services.debts.closeAndSetSourceInfo({ roomId: roomObjectId, sourceId: debtReceipt._id, sourceType: sourceType['RECEIPT'] }, session);

		await session.commitTransaction();

		await redis.set(redisKey, `SUCCESS:${JSON.stringify({ receiptId: debtReceipt._id })}`, 'EX', process.env.REDIS_EXP_SEC);
		return { receiptId: debtReceipt._id };
	} catch (error) {
		if (session) await session.abortTransaction();
		await redis.set(redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		if (session) session.endSession();
	}
};
