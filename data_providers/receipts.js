const mongoose = require('mongoose');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const generatePaymentContent = require('../utils/generatePaymentContent');
const AppError = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const getContractOwnerByRoomId = require('./customers').getContractOwnerByRoomId;

exports.createReceipt = async (data, cb, next) => {
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);
		const currentPeriod = await getCurrentPeriod(buildingObjectId);

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
		const paymentContent = await generatePaymentContent(process.env.PAYMENT_CONTENT_LENGTH);

		const newReceipt = {
			room: roomObjectId,
			receiptContent: data.receiptContent,
			amount: data.receiptAmount,
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
			paymentContent,
			date: data.date,
			payer: getPayer?.fullName,
			status: 'unpaid',
		};

		const createReceipt = await Entity.ReceiptsEntity.create(newReceipt);
		cb(null, createReceipt);
	} catch (error) {
		next(error);
	}
};

exports.createDepositReceipt = async (data, cb, next) => {
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);
		const currentPeriod = await getCurrentPeriod(buildingObjectId);

		const roomInfo = await Entity.RoomsEntity.findOne({ _id: roomObjectId });

		if (!roomInfo) {
			throw new Error(`Phòng ${data.roomId} không tồn tại trong hệ thống`);
		}

		const paymentContent = await generatePaymentContent(process.env.PAYMENT_CONTENT_LENGTH);

		const newReceipt = {
			room: roomObjectId,
			receiptContent: `Tiền cọc phòng ${roomInfo.roomIndex}`,
			amount: data.amount,
			paidAmount: 0,
			carriedOverPaidAmount: 0,
			paymentContent,
			payer: data.payer,
			receiptType: 'deposit',
			status: 'pending',
			isContractCreated: false,
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
			locked: false,
		};

		const createReceipt = await Entity.ReceiptsEntity.create(newReceipt);

		cb(null, createReceipt);
	} catch (error) {
		next(error);
	}
};

exports.getListReceiptPaymentStatus = async (data, cb, next) => {
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		let month;
		let year;

		if (!data.month && !data.year) {
			const currentPeriod = await getCurrentPeriod(buildingObjectId);
			month = currentPeriod.currentMonth;
			year = currentPeriod.currentYear;
		} else {
			month = Number(data.month);
			year = Number(data.year);
		}

		const receipts = await Entity.BuildingsEntity.aggregate([
			{
				$match: {
					_id: buildingObjectId,
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: '_id',
					foreignField: 'building',
					as: 'rooms',
				},
			},
			{
				$unwind: {
					path: '$rooms',
				},
			},
			{
				$lookup: {
					from: 'receipts',
					let: {
						roomId: '$rooms._id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$room', '$$roomId'],
										},
										{
											$eq: ['$month', month],
										},
										{
											$eq: ['$year', year],
										},
										{
											$in: ['$status', ['partial', 'paid', 'unpaid', 'cancelled']],
										},
									],
								},
							},
						},
					],
					as: 'receipts',
				},
			},
			{
				$lookup: {
					from: 'transactions',
					let: {
						receiptIds: {
							$map: {
								input: '$receipts',
								as: 'r',
								in: '$$r._id',
							},
						},
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$receipt', '$$receiptIds'],
								},
							},
						},
					],
					as: 'transactions',
				},
			},
			{
				$project: {
					_id: 1,
					rooms: {
						_id: '$rooms._id',
						roomIndex: '$rooms.roomIndex',
					},
					receipts: {
						$map: {
							input: '$receipts',
							as: 'receipt',
							in: {
								amount: '$$receipt.amount',
								status: '$$receipt.status',
								_id: '$$receipt._id',
								transaction: {
									$map: {
										input: {
											$filter: {
												input: '$transactions',
												as: 'transaction',
												cond: {
													$eq: ['$$transaction.receipt', '$$receipt._id'],
												},
											},
										},
										as: 't',
										in: {
											_id: '$$t._id',
											paymentMethod: '$$t.paymentMethod',
											collector: '$$t.collector',
										},
									},
								},
							},
						},
					},
				},
			},
			{
				$sort: {
					'rooms.roomIndex': 1,
				},
			},
			{
				$match: {
					'receipts.0': {
						$exists: true,
					},
				},
			},
			{
				$group: {
					_id: '$_id',
					receipts: {
						$push: {
							room: '$rooms',
							receiptInfo: '$receipts',
						},
					},
				},
			},
		]);

		if (receipts.length > 0) {
			cb(null, { period: { month, year }, listReceiptPaymentStatus: receipts[0].receipts });
		} else {
			cb(null, { period: { month, year }, listReceiptPaymentStatus: [] });
		}
	} catch (error) {
		next(error);
	}
};

exports.getReceiptDetail = async (data, cb, next) => {
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);
		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);

		const receiptInfo = await Entity.ReceiptsEntity.aggregate([
			{
				$match: {
					_id: receiptObjectId,
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: 'room',
					foreignField: '_id',
					as: 'roomInfo',
				},
			},
			{
				$lookup: {
					from: 'transactions',
					localField: '_id',
					foreignField: 'receipt',
					as: 'transactions',
				},
			},
			{
				$unwind: {
					path: '$transactions',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'transactions.collector',
					foreignField: '_id',
					as: 'collectorInfo',
				},
			},
			{
				$project: {
					_id: 1,
					status: 1,
					room: {
						$let: {
							vars: {
								roomObj: {
									$arrayElemAt: ['$roomInfo', 0],
								},
							},
							in: {
								_id: '$$roomObj._id',
								roomIndex: '$$roomObj.roomIndex',

								// thêm các trường khác nếu cần
							},
						},
					},
					receiptContent: 1,
					amount: 1,
					month: 1,
					year: 1,
					paymentContent: 1,
					date: 1,
					payer: 1,
					locked: 1,
					transactions: 1,
					paidAmount: 1,
					collectorInfo: {
						$arrayElemAt: ['$collectorInfo', 0],
					},
				},
			},
			{
				$group: {
					_id: {
						_id: '$_id',
						status: '$status',
						room: '$room',
						receiptContent: '$receiptContent',
						amount: '$amount',
						month: '$month',
						year: '$year',
						paymentContent: '$paymentContent',
						date: '$date',
						payer: '$payer',
						locked: '$locked',
						paidAmount: '$paidAmount',
					},
					transactionInfo: {
						$push: {
							$cond: [
								{
									$gt: [{ $ifNull: ['$transactions', null] }, null],
								},
								{
									_id: '$transactions._id',
									transactionDate: '$transactions.transactionDate',
									amount: '$transactions.amount',
									content: '$transactions.content',
									paymentMethod: '$transactions.paymentMethod',
									collector: {
										fullName: '$collectorInfo.fullName',
										_id: '$collectorInfo._id',
									},
									transactionId: '$transactions.transactionId',
								},
								'$$REMOVE',
							],
						},
					},
				},
			},
		]);

		if (receiptInfo.length > 0) {
			let receipt = receiptInfo[0]._id;
			if ((receipt.status === 'unpaid' || receipt.status == 'partial') && receipt.locked === false) {
				const bankInfo = await Entity.BanksEntity.findOne({ building: { $in: [buildingObjectId] } });
				console.log('log of bankInfo', bankInfo);
				cb(null, { receiptInfo: receipt, transactionInfo: receiptInfo[0].transactionInfo, paymentInfo: bankInfo });
			} else {
				cb(null, { receiptInfo: receipt, transactionInfo: receiptInfo[0].transactionInfo, paymentInfo: null });
			}
		} else {
			throw new Error(`Hóa đơn không tồn tại`);
		}
	} catch (error) {
		next(error);
	}
};

exports.getDepositReceiptDetail = async (data, cb, next) => {
	try {
		const receiptObjectIds = data.receiptIds.map((id) => mongoose.Types.ObjectId(id));
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);
		console.log('log of receiptObjectIds: ', receiptObjectIds);

		const receipts = await Entity.ReceiptsEntity.aggregate([
			{
				$match: {
					_id: {
						$in: receiptObjectIds,
					},
				},
			},
			{
				$lookup: {
					from: 'transactions',
					localField: '_id',
					foreignField: 'receipt',
					as: 'transactions',
				},
			},
			{
				$group: {
					_id: null,
					allTransactions: {
						$push: '$transactions',
					},
					docs: {
						$push: '$$ROOT',
					}, // gom tất cả doc vào mảng
				},
			},
			{
				$addFields: {
					mainReceipt: {
						$arrayElemAt: [
							{
								$filter: {
									input: '$docs',
									as: 'doc',
									cond: {
										$ne: ['$$doc.status', 'cancelled'],
									},
								},
							},
							0,
						],
					},
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: 'mainReceipt.room',
					foreignField: '_id',
					as: 'roomInfo',
				},
			},
			{
				$project: {
					_id: 0,
					mainReceipt: {
						$mergeObjects: [
							{
								_id: '$mainReceipt._id',
								receiptType: '$mainReceipt.receiptType',
								status: '$mainReceipt.status',
								locked: '$mainReceipt.locked',
								receiptContent: '$mainReceipt.receiptContent',
								amount: '$mainReceipt.amount',
								paymentContent: '$mainReceipt.paymentContent',
								date: '$mainReceipt.date',
								payer: '$mainReceipt.payer',
							},
							{
								roomInfo: {
									$let: {
										vars: {
											room: {
												$arrayElemAt: ['$roomInfo', 0],
											},
										},
										in: {
											_id: '$$room._id',
											roomIndex: '$$room.roomIndex',
										},
									},
								},
							},
						],
					},
					allTransactions: {
						$reduce: {
							input: '$allTransactions',
							initialValue: [],
							in: {
								$concatArrays: ['$$value', '$$this'],
							},
						},
					},
				},
			},
			{
				$unwind: {
					path: '$allTransactions',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'allTransactions.collector',
					foreignField: '_id',
					as: 'collectorInfo',
				},
			},
			{
				$unwind: {
					path: '$collectorInfo',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$set: {
					'allTransactions.collector': {
						_id: '$collectorInfo._id',
						fullName: '$collectorInfo.fullName',
					},
				},
			},
			{
				$group: {
					_id: null,
					receipt: {
						$first: '$mainReceipt',
					},
					transactions: {
						$push: '$allTransactions',
					},
				},
			},
		]);

		if (receipts.length === 0) throw new Error(`Hóa đơn đặt cọc không tồn tại.`);

		let receipt = receipts[0]?.receipt;
		let transactions = receipts[0]?.transactions;
		if ((receipt.status === 'unpaid' || receipt.status == 'partial') && receipt.locked === false) {
			const bankInfo = await Entity.BanksEntity.findOne({ building: { $in: [buildingObjectId] } });
			console.log('log of bankInfo', bankInfo);
			cb(null, { receiptInfo: receipt, transactionInfo: transactions, paymentInfo: bankInfo });
		} else {
			cb(null, { receiptInfo: receipt, transactionInfo: transactions, paymentInfo: null });
		}
	} catch (error) {
		next(error);
	}
};

exports.collectCashMoney = async (data, cb, next) => {
	try {
		// throw new AppError(errorCodes.notExist, 'Không tồn tại hóa đơn', 200);
		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);
		const collectorObjectId = mongoose.Types.ObjectId(data.userId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const { currentMonth, currentYear } = currentPeriod || {};

		const currentReceipt = await Entity.ReceiptsEntity.aggregate([
			{
				$match: {
					_id: receiptObjectId,
				},
			},
			{
				$lookup: {
					from: 'transactions',
					localField: '_id',
					foreignField: 'receipt',
					as: 'transactionInfo',
				},
			},
		]);

		if (currentReceipt.length == 0) {
			throw new Error(`Không tồn tại hóa đơn ${data.receiptId}`);
		}

		const createTransaction = await Entity.TransactionsEntity.create({
			transactionDate: data.date,
			amount: data.amount,
			paymentMethod: 'cash',
			receipt: receiptObjectId,
			collector: collectorObjectId,
			transferType: 'credit',
			month: currentMonth,
			year: currentYear,
		});

		var totalTransactionAmount = 0;
		const { transactionInfo, amount } = currentReceipt[0];
		if (transactionInfo?.length > 0) {
			totalTransactionAmount = transactionInfo.reduce((sum, item) => {
				return sum + item.amount;
			}, 0);
		}

		const updatedTotalPaid = totalTransactionAmount + createTransaction.amount;
		const remainingAmount = amount - updatedTotalPaid;
		console.log('log of remainingAmount: ', remainingAmount);

		let status = 'unpaid';
		if (remainingAmount <= 0) {
			status = 'paid';
		} else if (remainingAmount > 0 && updatedTotalPaid > 0) {
			status = 'partial';
		}

		await Entity.ReceiptsEntity.updateOne({ _id: receiptObjectId }, { $set: { status, paidAmount: updatedTotalPaid } });

		// cb(null, 'success');
		cb(null, {
			buildingId: data.buildingId,
			collectorName: data.fullName,
			amount: data.amount,
			receiptId: data.receiptId,
			role: data.role,
		});
	} catch (error) {
		next(error);
	}
};

exports.deleteReceipt = async (data, cb, next) => {
	try {
		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);

		const currentReceipt = await Entity.ReceiptsEntity.findOne({ _id: receiptObjectId });
		if (!currentReceipt) {
			throw new Error(`Hóa đơn ${data.receiptId} không tồn tại !`);
		}
		if (currentReceipt.status == 'partial' || currentReceipt.status == 'paid') {
			throw new Error('Bạn không thể xóa hóa đơn đã thanh toán !');
		}
		currentReceipt.status = 'cancelled';
		await currentReceipt.save();
		cb(null, 'success');
	} catch (error) {
		next(error);
	}
};

exports.createDebtsReceipt = async (data, cb, next) => {
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

		cb(null, { receiptId: debtReceipt._id });
		// 06/-8/2025
	} catch (error) {
		next(error);
	}
};

exports.modifyReceipt = async (data, cb, next) => {
	try {
		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);

		const currentReceipt = await Entity.ReceiptsEntity.findOne({ _id: receiptObjectId }).exec();
		if (!currentReceipt) throw new AppError(errorCodes.notExist, 'Hóa đơn không tồn tại', 200);

		const newAmount = Number(data.amount);

		// Tính lại status dựa trên paidAmount và amount mới
		const calculateReceiptStatusAfterModified = () => {
			const { paidAmount } = currentReceipt;

			if (paidAmount === 0) return 'unpaid';
			if (paidAmount < newAmount) return 'partial';
			if (paidAmount >= newAmount) return 'paid';
		};

		currentReceipt.amount = Number(data.amount);
		currentReceipt.receiptContent = data.receiptContent;
		currentReceipt.status = calculateReceiptStatusAfterModified();

		await currentReceipt.save();
		cb(null, 'success');
	} catch (error) {
		next(error);
	}
};
