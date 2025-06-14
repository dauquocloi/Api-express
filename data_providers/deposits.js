const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const listFees = require('../utils/getListFeeInital');
const getCurrentPeriod = require('../utils/getCurrentPeriod');

exports.createDeposit = async (data, cb, next) => {
	try {
		const dbs = MongoConnect.Connect(config.database.name);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);

		const { room, customer } = data;

		console.log('log of interior ', typeof data.interior);

		const checkTransaction = await Entity.TransactionsEntity.findOne({ receipt: receiptObjectId });

		if (!checkTransaction) {
			throw new Error('Giao dịch không tồn tại ! đặt cọc thất bại.');
		}

		const getInitialFeesByFeeKey = () => {
			let fees = [];
			for (const feeItem of data.fees) {
				const findFeeMatch = listFees.find((fee) => fee.feeKey === feeItem.feeKey);
				if (findFeeMatch) fees.push({ ...findFeeMatch, feeAmount: feeItem.feeAmount });
			}
			return fees;
		};

		console.log('log of getInitialFeesByFeeKey: ', getInitialFeesByFeeKey());

		const newDeposit = await Entity.DepositsEntity.create({
			room: roomObjectId,
			building: buildingObjectId,
			receipt: receiptObjectId,
			rent: room.rent,
			depositAmount: room.depositAmount,
			actualDepositAmount: room.actualDepositAmount,
			depositCompletionDate: room.depositCompletionDate,
			checkinDate: room.checkinDate,
			rentalTerm: room.rentalTerm,
			numberOfOccupants: room.numberOfOccupants,
			customer: customer,
			fees: getInitialFeesByFeeKey(),
			interiors: data.interior,
		});

		cb(null, newDeposit);
	} catch (error) {
		next(error);
	}
};

exports.getListDeposits = async (data, cb, next) => {
	try {
		const dbs = MongoConnect.Connect(config.database.name);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const deposits = await Entity.DepositsEntity.aggregate([
			{
				$match: {
					building: buildingObjectId,
					status: {
						$ne: 'close',
					},
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
				$group: {
					_id: '$building',
					listDeposits: {
						$push: {
							roomId: '$room',
							depositAmount: '$depositAmount',
							status: '$status',
							roomIndex: {
								$getField: {
									field: 'roomIndex',
									input: {
										$arrayElemAt: ['$roomInfo', 0],
									},
								},
							},
							_id: '$_id',
						},
					},
				},
			},
		]);

		cb(null, deposits[0].listDeposits ?? []);
	} catch (error) {
		next(error);
	}
};

exports.getDepositDetail = async (data, cb, next) => {
	try {
		const dbs = MongoConnect.Connect(config.database.name);
		const depositObjectId = mongoose.Types.ObjectId(data.depositId);

		const depositDetail = await Entity.DepositsEntity.aggregate([
			{
				$match: {
					_id: depositObjectId,
				},
			},
			{
				$lookup: {
					from: 'receipts',
					localField: 'receipt',
					foreignField: '_id',
					as: 'receiptInfo',
				},
			},
			{
				$unwind: {
					path: '$receiptInfo',
				},
			},
			{
				$lookup: {
					from: 'transactions',
					localField: 'receipt',
					foreignField: 'receipt',
					as: 'transactions',
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: 'room',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								roomIndex: 1,
							},
						},
					],
					as: 'roomInfo',
				},
			},
			{
				$unwind: {
					path: '$roomInfo',
				},
			},
		]);

		if (depositDetail.length === 0) {
			throw new Error(`Không có dữ liệu đặt cọc ${data.depositObjectId}`);
		}

		cb(null, depositDetail[0]);
	} catch (error) {
		next(error);
	}
};

exports.modifyDeposit = async (data, cb, next) => {
	try {
		const dbs = MongoConnect.Connect(config.database.name);
		const depositObjectId = mongoose.Types.ObjectId(data.depositId);
	} catch (error) {
		next(error);
	}
};
