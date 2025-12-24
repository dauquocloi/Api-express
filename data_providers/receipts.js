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

exports.getListReceiptPaymentStatus = async (buildingId, month, year) => {
	const buildingObjectId = mongoose.Types.ObjectId(buildingId);

	if (!month && !year) {
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		month = currentPeriod.currentMonth;
		year = currentPeriod.currentYear;
	} else {
		Number(month);
		Number(year);
	}

	const receipt = await Services.receipts.getListReceiptsPaymentStatus(buildingObjectId, month, year);

	return { period: { month, year }, listReceiptPaymentStatus: receipt.receipts };
};

exports.createDepositReceipt = async (roomId, buildingId, receipAmount, payerName) => {
	const roomObjectId = mongoose.Types.ObjectId(roomId);
	const buildingObjectId = mongoose.Types.ObjectId(buildingId);
	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const roomInfo = await Entity.RoomsEntity.findOne({ _id: roomObjectId });
	if (!roomInfo) {
		throw new NotFoundError(`Phòng với id: ${roomId} không tồn tại !`);
	}

	const newReceipt = {
		roomObjectId: roomObjectId,
		receiptAmount: receipAmount,
		payer: payerName,
		currentPeriod,

		receiptContent: `Tiền cọc phòng ${roomInfo.roomIndex}`,
		receiptType: receiptTypes['DEPOSIT'],
		status: receiptStatus['PENDING'],
	};
	const createReceipt = await Services.receipts.createReceipt(newReceipt);
	return createReceipt;
};

exports.createReceipt = async (roomId, buildingId, receiptAmount, receiptContent, date, userId) => {
	const roomObjectId = mongoose.Types.ObjectId(roomId);
	const buildingObjectId = mongoose.Types.ObjectId(buildingId);

	await Services.rooms.assertRoomWritable({ roomId, userId, session: null });

	const [currentPeriod, contractOwner] = await Promise.all([getCurrentPeriod(buildingObjectId), Services.customers.getContractOwner(roomObjectId)]);

	const receiptCreated = await Services.receipts.createReceipt({
		roomObjectId: roomId,
		receiptAmount: receiptAmount,
		payer: contractOwner?.fullName,
		currentPeriod: currentPeriod,
		receiptContent,
		receiptType: receiptTypes['INCIDENTAL'],
		initialStatus: receiptStatus['UNPAID'],
		date: date,
	});

	return receiptCreated;
};

exports.getReceiptDetail = async (receiptId, buildingId) => {
	// const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);
	const receiptObjectId = mongoose.Types.ObjectId(receiptId);

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
	const receiptObjectId = mongoose.Types.ObjectId(receiptId);
	const buildingObjectId = mongoose.Types.ObjectId(buildingId);

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

// un refacted
exports.collectCashMoney = async (data) => {
	let session;
	let redisKey = data.redisKey;
	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);
		const collectorObjectId = mongoose.Types.ObjectId(data._id);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const currentReceipt = await Services.receipts.getCurrentReceiptAndTransaction(receiptObjectId, session);
		if (currentReceipt.version !== data.version) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
		if (data.amount > currentReceipt.amount) throw new InvalidInputError(`Số tiền thu không hợp lệ !`);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);

		const receiptUnpaidAmount = currentReceipt.amount - currentReceipt.paidAmount;
		const createTransaction = await Services.transactions.createCashTransaction(
			{
				amount: data.amount,
				date: new Date(),
				type: 'receipt',
				collectorId: collectorObjectId,
				id: receiptObjectId,
				currentPeriod,
				idempotencyKey: redisKey,
			},
			session,
		);

		let totalTransactionAmount = 0;
		const { transactionInfo, amount } = currentReceipt;
		if (transactionInfo?.length > 0) {
			totalTransactionAmount = transactionInfo.reduce((sum, item) => {
				return sum + item.amount;
			}, 0);
		}

		const updatedTotalPaid = totalTransactionAmount + createTransaction.amount;
		const remainingAmount = amount - updatedTotalPaid;

		let status = receiptStatus['UNPAID'];
		if (remainingAmount <= 0) {
			status = receiptStatus['PAID'];
		} else if (remainingAmount > 0 && updatedTotalPaid > 0) {
			status = receiptStatus['PARTIAL'];
		}

		await Entity.ReceiptsEntity.updateOne(
			{ _id: receiptObjectId },
			{ $set: { status: status, paidAmount: updatedTotalPaid, version: { $inc: 1 } } },
			{ session },
		);

		//=========update if receipt is isDepositing;=== Đoạn này nên bỏ vì khi tạo đã khóa hóa đơn.
		if (currentReceipt.isDepositing === true) {
			const depositRefund = await Entity.DepositRefundsEntity.findOne({ receiptsUnpaid: receiptObjectId });
			if (!depositRefund) throw new AppError(errorCodes.notExist, "Deposit refund doesn't exist", 404);
			const { depositRefundAmount } = depositRefund;

			if (status === 'paid') {
				depositRefund.depositRefundAmount = depositRefundAmount + receiptUnpaidAmount;
				depositRefund.receiptsUnpaid = depositRefund.receiptsUnpaid.filter((receipt) => !receipt._id.equals(receiptObjectId));
			} else if (status === 'partial') {
				depositRefund.depositRefundAmount = depositRefundAmount + Number(data.amount);
			}

			await depositRefund.save({ session });
		}
		//=========

		await session.commitTransaction();

		const cbData = {
			buildingId: data.buildingId,
			collectorName: data.fullName,
			amount: data.amount,
			receiptId: data.receiptId,
			role: data.role,
		};

		await redis.set(redisKey, `SUCCESS:${JSON.stringify(cbData)}`, 'EX', 86400); //24h

		return cbData;
	} catch (error) {
		if (session) await session.abortTransaction();
		await redis.del(redisKey);
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.deleteReceipt = async (receiptId, userId) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentReceipt = await Entity.ReceiptsEntity.findOne({ _id: receiptId }).session(session);
			if (!currentReceipt) throw new NotFoundError('Hóa đơn không tồn tại');

			await Services.rooms.assertRoomWritable({ roomId: currentReceipt.room, userId, session });

			currentReceipt.status = receiptStatus['CANCELLED'];
			currentReceipt.locked = true;

			await currentReceipt.save({ session });
			return;
		});
		return 'Success';
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.modifyReceipt = async (receiptId, newReceiptAmount, receiptContent, userId) => {
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
		return 'Success';
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

//=======================UN REFACTED==========================//

exports.createDebtsReceipt = async (data) => {
	let session;
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		session = await mongoose.startSession();
		session.startTransaction();

		const currentDebts = await Entity.DebtsEntity.find({ room: roomObjectId, status: { $nin: ['terminated', 'paid'] } }).session(session);
		if (currentDebts.length === 0) {
			throw new Error(`Phòng không tồn tại khoản nợ nào.`);
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
		const getContractOwnerByRoomIdAsync = (data) => {
			return new Promise((resolve, reject) => {
				getContractOwnerByRoomId(
					data,
					(err, result) => {
						if (err) return reject(err);
						resolve(result);
					},
					next,
				);
			});
		};
		const getPayer = await getContractOwnerByRoomIdAsync(data);

		const newReceipt = {
			room: roomObjectId,
			receiptContentDetail: formateDebts.content,
			receiptContent: data.receiptContent,
			amount: formateDebts.amount,
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
			paymentContent: generatePaymentContent(),
			date: data.date,
			payer: getPayer?.fullName,
			status: 'unpaid',
			receiptType: 'debts',
		};
		const [debtReceipt] = await Entity.ReceiptsEntity.create([newReceipt], { session });
		console.log('log of debtReceipt from createDebtsReceipt: ', debtReceipt);

		await Entity.DebtsEntity.findOneAndUpdate(
			{ room: roomObjectId, status: { $nin: ['terminated', 'paid'] } },
			{ status: 'terminated', sourceId: debtReceipt._id, sourceType: 'receipt' },
		).session(session);

		await session.commitTransaction();

		return { receiptId: debtReceipt._id };
		// 06/-8/2025
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		if (session) session.endSession();
	}
};
