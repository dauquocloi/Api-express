const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const generatePaymentContent = require('../utils/generatePaymentContent');
const getContractOwnerByRoomId = require('./customers').getContractOwnerByRoomId;

exports.createReceipt = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
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
					reject,
				);
			});
		};
		const getPayer = await getContractOwnerByRoomIdAsync(data);
		let month;
		let year;

		const newReceipt = {
			room: roomObjectId,
			receiptContent: data.receiptContent,
			amount: data.receiptAmount,
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
			paymentContent: generatePaymentContent(),
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
		const db = MongoConnect.Connect(config.database.name);
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const roomInfo = await Entity.RoomsEntity.findOne({ _id: roomObjectId });
		const currentPeriod = await getCurrentPeriod(roomInfo.building);

		if (!roomInfo) {
			throw new Error(`Phòng ${data.roomId} không tồn tại trong hệ thống`);
		}

		const newReceipt = {
			room: roomObjectId,
			receiptContent: `Tiền cọc phòng ${roomInfo.roomIndex}`,
			amount: data.amount,
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
			status: 'pending',
			paymentContent: generatePaymentContent(),
			payer: data.payer,
		};

		const createReceipt = await Entity.ReceiptsEntity.create(newReceipt);
		console.log('log of receiptDeposit created successfull: ', createReceipt);
		cb(null, createReceipt);
	} catch (error) {
		next(error);
	}
};

exports.getListReceiptPaymentStatus = async (data, cb, next) => {
	try {
		const dbs = MongoConnect.Connect(config.database.name);
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
		const db = MongoConnect.Connect(config.database.name);
		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

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
			throw new Error(`Không tìm thấy dữ liệu hóa đơn ${data.receiptId}`);
		}
	} catch (error) {
		next(error);
	}
};

exports.collectCashMoney = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);
		const collectorObjectId = mongoose.Types.ObjectId(data.userId);

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
		});

		var totalTransactionAmount;
		const { transactionInfo, amount } = currentReceipt[0];
		if (transactionInfo?.length > 0) {
			totalTransactionAmount = transactionInfo.reduce((sum, item) => {
				return sum + item.amount;
			}, 0);
		} else {
			totalTransactionAmount = 0;
		}

		const updatedTotalPaid = totalTransactionAmount + createTransaction.amount;
		const remainingAmount = amount - updatedTotalPaid;

		let status = 'unpaid';
		if (remainingAmount <= 0) {
			status = 'paid';
		} else if (remainingAmount > 0 && updatedTotalPaid > 0) {
			status = 'partial';
		}

		await Entity.ReceiptsEntity.updateOne({ _id: receiptObjectId }, { $set: { status } });

		cb(null, 'success');
	} catch (error) {
		next(error);
	}
};

exports.deleteReceipt = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
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
