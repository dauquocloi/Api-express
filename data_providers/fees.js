const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const getListFeeInitial = require('../utils/getListFeeInital');
const AppError = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');

exports.getFeesByRoomId = async (data, cb, next) => {
	try {
		let roomId = mongoose.Types.ObjectId(`${data}`);
		const fees = await Entity.FeesEntity.find({ room: roomId });

		if (!fees) {
			throw new Error(`Không có dữ liệu ${data}`);
		}
		cb(null, fees);
	} catch (error) {
		next(error);
	}
};

exports.addFee = async (data, cb, next) => {
	console.log(data);
	try {
		let roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const listFeeInital = getListFeeInitial;
		var findFee = listFeeInital.find((fee) => fee.feeKey == data.feeKey);
		if (!findFee) {
			throw new Error('Phí không hợp lệ!');
		}

		const currentFee = await Entity.FeesEntity.findOne({ room: roomObjectId, feeKey: findFee.feeKey });
		if (currentFee) {
			throw new Error(`Phí ${findFee.feeName} đã tồn tại trong phòng`);
		}
		const newFeeInfo = {
			feeKey: findFee.feeKey,
			unit: findFee.unit,
			feeName: findFee.feeName,
			iconPath: findFee.iconPath,
			feeAmount: data.feeAmount,
			room: roomObjectId,
		};

		if (findFee.unit === 'index') {
			newFeeInfo.lastIndex = Number(data.lastIndex);
		}
		console.log('log of new Fee', newFeeInfo);
		let feeCreated = await Entity.FeesEntity.create(newFeeInfo);

		cb(null, 'success');
	} catch (error) {
		next(error);
	}
};

exports.deleteFee = async (data, cb, next) => {
	try {
		const feeObjectId = mongoose.Types.ObjectId(data.feeId);
		await Entity.FeesEntity.deleteOne({ _id: feeObjectId });
		cb(null, 'success');
	} catch (error) {
		next(error);
	}
};

exports.editFee = async (data, cb, next) => {
	try {
		const feeObjectId = mongoose.Types.ObjectId(data.feeId);

		const feeRecent = await Entity.FeesEntity.findOne({ _id: feeObjectId }).exec();

		if (!feeRecent) {
			throw new AppError(errorCodes.notExist, `Phí không tồn tại`, 200);
		}

		if (feeRecent.unit === 'index') {
			feeRecent.lastIndex = data.lastIndex;
		}
		feeRecent.feeAmount = data.feeAmount;

		await feeRecent.save();

		cb(null, 'success');
	} catch (error) {
		next(error);
	}
};
