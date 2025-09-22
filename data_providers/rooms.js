const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { query } = require('express');
const uploadFile = require('../utils/uploadFile');
const { generateFirstInvoice } = require('./invoices');
const { createDepositReceipt } = require('./receipts');
const { note } = require('pdfkit');

exports.getAll = async (data, cb, next) => {
	try {
		const buildingId = mongoose.Types.ObjectId(`${data.buildingId}`);
		const listRooms = await Entity.BuildingsEntity.aggregate([
			{
				$match: {
					_id: buildingId,
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: '_id',
					foreignField: 'building',
					as: 'roomInfo',
				},
			},
			{
				$unwind: {
					path: '$roomInfo',
				},
			},
			{
				$sort: {
					'roomInfo.roomIndex': 1,
				},
			},
			{
				$project: {
					_id: '$_id',
					roomId: '$roomInfo._id',
					roomIndex: '$roomInfo.roomIndex',
					roomPrice: '$roomInfo.roomPrice',
					roomState: '$roomInfo.roomState',
					isDeposited: '$roomInfo.isDeposited',
				},
			},

			{
				$group: {
					_id: '$_id',
					roomInfo: {
						$push: {
							_id: '$roomId',
							roomIndex: '$roomIndex',
							roomPrice: '$roomPrice',
							roomState: '$roomState',
							isDeposited: '$isDeposited',
						},
					},
				},
			},
		]);
		if (listRooms.length > 0) {
			const { roomInfo } = listRooms[0];
			cb(null, roomInfo);
		} else {
			next(new Error('can not find rooms !'));
		}
	} catch (error) {
		next(error);
	}
};

exports.getRoom = async (data, cb, next) => {
	try {
		const roomObjectId = mongoose.Types.ObjectId(`${data.roomId}`);

		console.time('fetch room');
		const roomInfo = await Entity.RoomsEntity.aggregate([
			{
				$match: {
					_id: roomObjectId,
				},
			},
			{
				$lookup: {
					from: 'fees',
					localField: '_id',
					foreignField: 'room',
					as: 'feeInfo',
				},
			},
			{
				$lookup: {
					from: 'contracts',
					let: {
						roomId: '$_id',
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
											$ne: ['$status', 'terminated'],
										},
									],
								},
							},
						},
						{
							$sort: {
								contractEndDate: -1,
							},
						},
						{
							$limit: 1,
						},
					],
					as: 'contractInfo',
				},
			},
			{
				$unwind: {
					path: '$contractInfo',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: 'receipts',
					let: {
						receiptId: '$contractInfo.deposit.receipt',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$not: {
												$in: ['$status', ['cancelled']],
											},
										},
										{
											$eq: ['$_id', '$$receiptId'],
										},
									],
								},
							},
						},
					],
					as: 'depositInfo',
				},
			},
			{
				$lookup: {
					from: 'customers',
					localField: '_id',
					foreignField: 'room',
					as: 'customerInfo',
				},
			},
			{
				$lookup: {
					from: 'vehicles',
					localField: 'customerInfo._id',
					foreignField: 'owner',
					as: 'vehicleInfo',
				},
			},
			{
				$lookup: {
					from: 'debts',
					let: {
						roomId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$status', 'pending'],
										},
										{
											$eq: ['$room', '$$roomId'],
										},
									],
								},
							},
						},
					],
					as: 'debtsInfo',
				},
			},
			{
				$lookup: {
					from: 'deposits',
					let: {
						roomId: '$_id',
						roomState: '$roomState',
						isDeposited: '$isDeposited',
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
											$ne: ['$status', 'cancelled'],
										},
										{
											$eq: ['$$isDeposited', true],
										},
									],
								},
							},
						},
						{
							$project: {
								_id: 1,
							},
						},
					],
					as: 'depositId',
				},
			},
			{
				$project: {
					_id: 1,
					roomImage: 1,
					building: 1,
					roomIndex: 1,
					interior: 1,
					roomState: 1,
					feeInfo: 1,
					debtsInfo: 1,
					isRefundDeposit: 1,
					note: 1,
					contractInfo: {
						_id: '$contractInfo._id',
						rent: '$contractInfo.rent',
						contractSignDate: '$contractInfo.contractSignDate',
						contractEndDate: '$contractInfo.contractEndDate',
						contractTerm: '$contractInfo.contractTerm',
						status: '$contractInfo.status',
						contractPdfUrl: '$contractInfo.contractPdfUrl',
						deposit: {
							$let: {
								vars: {
									firstDeposit: {
										$arrayElemAt: ['$depositInfo', 0],
									},
								},
								in: {
									_id: '$$firstDeposit._id',
									amount: '$$firstDeposit.amount',
									status: '$$firstDeposit.status',
									receipts: '$contractInfo.deposit.receipts',
								},
							},
						},
					},
					customerInfo: 1,
					vehicleInfo: 1,
					depositId: {
						$getField: {
							field: '_id',
							input: {
								$arrayElemAt: ['$depositId', 0],
							},
						},
					},
				},
			},
		]);
		console.timeEnd('fetch room');

		if (roomInfo.length > 0) {
			cb(null, roomInfo);
		} else {
			next(new Error('can not find rooms !'));
		}
	} catch (error) {
		next(error);
	}
};

exports.update = (data, cb) => {
	MongoConnect.Connect(config.database.fullname)
		.then(async (db) => {
			let RoomUpdated = await Entity.RoomsEntity.updateOne(
				{ _id: data.roomId },
				{
					$set: {
						roomprice: data.roomprice,
						roomdeposit: data.roomdeposit,
						roomtypes: data.roomtypes,
						roomacreage: data.roomacreage,
						maylanh: data.maylanh,
						giengtroi: data.giengtroi,
						gac: data.gac,
						kebep: data.kebep,
						bonruachen: data.bonruachen,
						cuaso: data.cuaso,
						bancong: data.bancong,
						tulanh: data.tulanh,
						tivi: data.tivi,
						thangmay: data.tivi,
						nuocnong: data.nuocnong,
						giuong: data.giuong,
						nem: data.nem,
						tuquanao: data.tuquanao,
						chungchu: data.chungchu,
						baove: data.baove,
					},
				},
				{
					upsert: true,
				},
			);
		})
		.then(async () => {
			let ServiceUpdated = await Entity.ServicesEntity.updateOne(
				{
					room: data.roomId,
				},
				{
					$set: {
						electric: data.electric,
						waterindex: data.waterindex,
						water: data.water,
						generalservice: data.generalservice,
						iswaterpayment: data.iswaterpayment,
					},
				},
				{
					upsert: true,
				},
			);
		})
		.then(async () => {
			let PaymentUpdated = await Entity.PaymentsEntity.updateOne(
				{ room: data.roomId },
				{
					$set: {
						accountnumber: data.accountnumber,
						accountname: data.accountname,
						bankname: data.bankname,
						tranfercontent: data.tranfercontent,
						note: data.note,
					},
				},
				{
					upsert: true,
				},
			);
		})
		.then(() => {
			let result = {
				room: {
					roomprice: data.roomPrice,
				},
				service: {
					generalservice: data.generalservice,
					motobike: data.motobike,
					elevator: data.elevator,
					water: data.water,
					electric: data.electric,
				},
			};
			cb(null, 'update succesfully');
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
		});
};

// finance update
exports.financeUpdate = (data, cb) => {
	let roomUpdated;
	MongoConnect.Connect(config.database.fullname).then(async (db) => {
		roomUpdated = Entity.RoomsEntity.updateOne({ _id: data.roomId }, {});
	});
};

// lấy thông tin tài chính của Phòng
exports.finance = (data, cb) => {
	var roomId = mongoose.Types.ObjectId(`${data.roomId}`);
	let queryRooms;
	MongoConnect.Connect(config.database.fullname).then((db) => {
		queryRooms = Entity.RoomsEntity.aggregate(
			[
				{
					$match: {
						_id: roomId,
					},
				},
				{
					$lookup: {
						from: 'services',
						localField: '_id',
						foreignField: 'room',
						as: 'serviceInfo',
					},
				},
				{
					$unwind: '$serviceInfo',
				},
				{
					$project: {
						serviceInfoArray: {
							$objectToArray: '$serviceInfo',
						},
						roompriceKeyValue: [{ k: 'roomprice', v: '$roomprice' }],
						roomdepositKeyValue: [{ k: 'roomdeposit', v: '$roomdeposit' }],
					},
				},
				{
					$project: {
						combinedArray: {
							$concatArrays: ['$roompriceKeyValue', '$roomdepositKeyValue', '$serviceInfoArray'],
						},
					},
				},
				{
					$project: {
						finance: {
							$filter: {
								input: '$combinedArray',
								as: 'item',
								cond: {
									$and: [{ $ne: ['$$item.k', '__v'] }, { $ne: ['$$item.k', '_id'] }, { $ne: ['$$item.k', 'room'] }],
								},
							},
						},
					},
				},
			],
			cb,
		);
	});
};

exports.importImage = async (data, cb, next) => {
	try {
		const roomId = mongoose.Types.ObjectId(`${data.roomId}`);
		const currentRoom = await Entity.RoomsEntity.findById(roomId);
		if (!currentRoom) throw new Error('Phòng không tồn tại !');

		const roomImages = [];
		for (const image of data.imagesRoom) {
			const handleuploadFile = await uploadFile(image);
			roomImages.push(handleuploadFile.Key);
		}

		if (currentRoom.roomImage?.ref) {
			currentRoom.roomImage.ref = roomImages;
		}

		const importedRoomImages = await currentRoom.save();
		cb(null, importedRoomImages);
	} catch (error) {
		next(error);
	}
};

exports.addInterior = async (data, cb, next) => {
	try {
		const roomId = mongoose.Types.ObjectId(data.roomId);

		const newInteriorInfo = {
			_id: new mongoose.Types.ObjectId(),
			interiorName: data.interiorName,
			quantity: data.interiorQuantity,
			interiorRentalDate: data.interiorRentalDate,
		};

		const newInterior = await Entity.RoomsEntity.findByIdAndUpdate(roomId, { $push: { interior: newInteriorInfo } }, { new: true });
		if (newInterior != null) {
			cb(null, newInterior);
		} else {
			throw new Error('Cannot find room !');
		}
	} catch (error) {
		next(error);
	}
};

exports.removeInterior = async (data, cb, next) => {
	try {
		const interiorId = mongoose.Types.ObjectId(`${data.interiorId}`);

		const interiorRemoved = await Entity.RoomsEntity.findOneAndUpdate(
			{ 'interior._id': interiorId },
			{ $pull: { interior: { _id: interiorId } } },
			{ new: true, runValidators: true },
		);
		if (interiorRemoved != null) {
			console.log(interiorRemoved);
			cb(null, interiorRemoved);
		} else {
			return next(new Error('interior does not exist'));
		}
	} catch (error) {
		next(error);
	}
};

exports.editInterior = async (data, cb, next) => {
	try {
		const interiorId = mongoose.Types.ObjectId(`${data.interiorId}`);
		const roomId = mongoose.Types.ObjectId(`${data.roomId}`);

		const interior = await Entity.RoomsEntity.findOneAndUpdate(
			{
				_id: roomId, // roomId
				'interior._id': interiorId, // interiorId
			},
			{
				$set: {
					'interior.$.interiorName': data.interiorName,
					'interior.$.quantity': data.quantity, // Cập nhật số lượng
					'interior.$.interiorRentalDate': data.interiorRentalDate, // Cập nhật ngày thuê
				},
			},
			{ new: true },
		);
		if (interior != null) {
			cb(null, interior);
		} else {
			return next(new Error('interior does not exist'));
		}
	} catch (error) {
		next(error);
	}
};

exports.setRoomUnRenting = async (data, cb, next) => {
	try {
		if (data.SetUnRentingType == 'early') {
		}
	} catch (error) {
		next(error);
	}
};

exports.getListSelectingRoom = async (data, cb, next) => {
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);
		const listRooms = await Entity.BuildingsEntity.aggregate([
			{
				$match: {
					_id: buildingObjectId,
				},
			},
			{
				$lookup: {
					from: 'rooms',
					let: { buildingId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$building', '$$buildingId'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								roomIndex: 1,
							},
						},
					],
					as: 'listRooms',
				},
			},
		]);

		if (listRooms.length == 0) {
			throw new Error(`Tòa nhà với Id: ${data.buildingId} không tồn tại !`);
		}
		cb(null, listRooms[0].listRooms);
	} catch (error) {
		next(error);
	}
};

// exports.getDepositByRoomId = async (data, cb, next) => {
// 	try {
// 		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
// 		const findDeposit = await Entity.DepositsEntity.findOne({ room: roomObjectId, status: { $nin: ['close', 'cancelled'] } });

// 		cb(null, findDeposit);
// 	} catch (error) {
// 		next(error);
// 	}
// };

exports.generateDepositReceiptAndFirstInvoice = async (data, cb, next) => {
	let session;
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		session = await mongoose.startSession();
		session.startTransaction();

		const generateInvoiceAsync = (data) => {
			return new Promise((resolve, reject) => {
				generateFirstInvoice(
					data,
					(err, result) => {
						if (err) return reject(err);
						resolve(result);
					},
					next,
				);
			});
		};

		const createReceiptAsync = (data) => {
			return new Promise((resolve, reject) => {
				createDepositReceipt(
					data,
					(err, result) => {
						if (err) return reject(err);
						resolve(result);
					},
					next,
				);
			});
		};

		const generateInvoice = await generateInvoiceAsync(data);

		const createReceipt = await createReceiptAsync(data);

		cb(null, {
			invoiceId: generateInvoice._id,
			receiptId: createReceipt._id,
		});
	} catch (error) {
		if (session) await session.abortTransaction();
		next(error);
	} finally {
		if (session) session.endSession();
	}
};

exports.generateDepositRefund = async (data, cb, next) => {
	let session;
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);

		session = await mongoose.startSession();
		session.startTransaction();

		const receiptDeposit = await Entity.ReceiptsEntity.findOne({ _id: receiptObjectId }).session(session);

		if (!receiptDeposit) throw new Error(`Hóa đơn đặt cọc không tồn tại`);

		const [newDepositRefund] = await Entity.DepositRefundsEntity.create(
			[
				{
					room: roomObjectId,
					feesIndex: data.fees,
					feesOther: data.feesOther,
					depositRefundAmount: data.depositRefundAmount,
					currentDeposit: {
						amount: receiptDeposit.amount,
						receipt: receiptObjectId,
					},
					isRefundedDeposited: false,
				},
			],
			{ session },
		);

		await Entity.ReceiptsEntity.updateOne({ _id: receiptObjectId }, { $set: { locked: true } }, { session });
		await Entity.RoomsEntity.updateOne({ _id: roomObjectId }, { $set: { isRefundDeposit: true } }, { session });

		await session.commitTransaction();

		cb(null, newDepositRefund);
	} catch (error) {
		if (session) await session.abortTransaction();
		next(error);
	} finally {
		if (session) session.endSession();
	}
};

exports.getDepositRefund = async (data, cb, next) => {
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);

		const depositRefund = await Entity.DepositRefundsEntity.findOne({ room: roomObjectId, isRefundedDeposit: false });

		if (!depositRefund) throw new Error('Phiếu đặt cọc không tồn tại');

		cb(null, depositRefund);
	} catch (error) {
		next(error);
	}
};

exports.updateNoteRoom = async (data, cb, next) => {
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const updatedRoom = await Entity.RoomsEntity.findByIdAndUpdate(
			roomObjectId,
			{ $set: { note: data.note } },
			{ new: true, runValidators: true },
		);
		if (!updatedRoom) throw new Error('Cập nhật ghi chú không thành công !');
		cb(null, 'Cập nhật ghi chú thành công !');
	} catch (error) {
		next(error);
	}
};
