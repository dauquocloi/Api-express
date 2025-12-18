const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const listFeeInitial = require('../utils/getListFeeInital');
const { AppError, NotFoundError, InternalError, InvalidInputError } = require('../AppError');

exports.addFee = async (roomId, feeKey, feeAmount) => {
	let roomObjectId = mongoose.Types.ObjectId(roomId);

	let findFee = listFeeInitial.find((fee) => fee.feeKey == feeKey);
	if (!findFee) {
		throw new InvalidInputError('Phí không hợp lệ!');
	}

	const currentFee = await Entity.FeesEntity.findOne({ room: roomObjectId, feeKey: findFee.feeKey });
	if (currentFee) {
		throw new InvalidInputError(`Phí ${findFee.feeName} đã tồn tại`);
	}
	const newFeeInfo = {
		feeKey: findFee.feeKey,
		unit: findFee.unit,
		feeName: findFee.feeName,
		iconPath: findFee.iconPath,
		feeAmount: Number(feeAmount),
		room: roomObjectId,
	};

	if (findFee.unit === 'index') {
		newFeeInfo.lastIndex = Number(data.lastIndex);
	}
	console.log('log of new Fee', newFeeInfo);
	const feeCreated = await Entity.FeesEntity.create(newFeeInfo);
	if (!feeCreated) throw new FailureMsgResponse('Có lỗi xảy ra trong quá trình thêm phí mới !');
	return feeCreated;
};

// exports.getFeesByRoomId = async (data, cb, next) => {
// 	try {
// 		let roomId = mongoose.Types.ObjectId(`${data}`);
// 		const fees = await Entity.FeesEntity.find({ room: roomId });

// 		if (!fees) {
// 			throw new Error(`Không có dữ liệu ${data}`);
// 		}
// 		cb(null, fees);
// 	} catch (error) {
// 		next(error);
// 	}
// };

exports.deleteFee = async (feeId) => {
	const feeObjectId = mongoose.Types.ObjectId(data.feeId);
	await Entity.FeesEntity.deleteOne({ _id: feeObjectId });
	return 'success';
};

exports.editFee = async (data) => {
	const feeObjectId = mongoose.Types.ObjectId(data.feeId);
	const feeRecent = await Entity.FeesEntity.findOne({ _id: feeObjectId }).exec();

	if (!feeRecent) new NotFoundError('Phí không tồn tại');

	if (feeRecent.unit === 'index') {
		feeRecent.lastIndex = data.lastIndex;
	}
	feeRecent.feeAmount = data.feeAmount;

	await feeRecent.save();

	return 'Success';
};
