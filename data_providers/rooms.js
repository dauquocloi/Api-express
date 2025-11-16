const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { query } = require('express');
const uploadFile = require('../utils/uploadFile');
const { generateFirstInvoice } = require('./invoices');
const { createDepositReceipt } = require('./receipts');
const { note } = require('pdfkit');
const { errorCodes } = require('../constants/errorCodes');
const AppError = require('../AppError');

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
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);

		console.time('fetch room');
		const [roomInfo] = await Entity.RoomsEntity.aggregate([
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
					roomPrice: 1,
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
		if (!roomInfo) throw new AppError(errorCodes.notExist, 'Phòng không tồn tại', 200);

		cb(null, roomInfo);
	} catch (error) {
		next(error);
	}
};

// PIECE OF SHIT
// exports.update = (data, cb) => {
// 	MongoConnect.Connect(config.database.fullname)
// 		.then(async (db) => {
// 			let RoomUpdated = await Entity.RoomsEntity.updateOne(
// 				{ _id: data.roomId },
// 				{
// 					$set: {
// 						roomprice: data.roomprice,
// 						roomdeposit: data.roomdeposit,
// 						roomtypes: data.roomtypes,
// 						roomacreage: data.roomacreage,
// 						maylanh: data.maylanh,
// 						giengtroi: data.giengtroi,
// 						gac: data.gac,
// 						kebep: data.kebep,
// 						bonruachen: data.bonruachen,
// 						cuaso: data.cuaso,
// 						bancong: data.bancong,
// 						tulanh: data.tulanh,
// 						tivi: data.tivi,
// 						thangmay: data.tivi,
// 						nuocnong: data.nuocnong,
// 						giuong: data.giuong,
// 						nem: data.nem,
// 						tuquanao: data.tuquanao,
// 						chungchu: data.chungchu,
// 						baove: data.baove,
// 					},
// 				},
// 				{
// 					upsert: true,
// 				},
// 			);
// 		})
// 		.then(async () => {
// 			let ServiceUpdated = await Entity.ServicesEntity.updateOne(
// 				{
// 					room: data.roomId,
// 				},
// 				{
// 					$set: {
// 						electric: data.electric,
// 						waterindex: data.waterindex,
// 						water: data.water,
// 						generalservice: data.generalservice,
// 						iswaterpayment: data.iswaterpayment,
// 					},
// 				},
// 				{
// 					upsert: true,
// 				},
// 			);
// 		})
// 		.then(async () => {
// 			let PaymentUpdated = await Entity.PaymentsEntity.updateOne(
// 				{ room: data.roomId },
// 				{
// 					$set: {
// 						accountnumber: data.accountnumber,
// 						accountname: data.accountname,
// 						bankname: data.bankname,
// 						tranfercontent: data.tranfercontent,
// 						note: data.note,
// 					},
// 				},
// 				{
// 					upsert: true,
// 				},
// 			);
// 		})
// 		.then(() => {
// 			let result = {
// 				room: {
// 					roomprice: data.roomPrice,
// 				},
// 				service: {
// 					generalservice: data.generalservice,
// 					motobike: data.motobike,
// 					elevator: data.elevator,
// 					water: data.water,
// 					electric: data.electric,
// 				},
// 			};
// 			cb(null, 'update succesfully');
// 		})
// 		.catch((err) => {
// 			console.log('rooms_Dataprovider_create: ' + err);
// 			cb(err, null);
// 		});
// };

// finance update
exports.financeUpdate = (data, cb) => {
	let roomUpdated;
	MongoConnect.Connect(config.database.fullname).then(async (db) => {
		roomUpdated = Entity.RoomsEntity.updateOne({ _id: data.roomId }, {});
	});
};

// PIECE OF SHIT
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
					'interior.$.quantity': data.interiorQuantity, // Cập nhật số lượng
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
									$and: [{ $eq: ['$building', '$$buildingId'] }, { $ne: ['$roomState', 0] }],
								},
							},
						},
						{
							$project: {
								_id: 1,
								roomIndex: 1,
							},
						},
						{
							$sort: {
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
		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const { buildingId, contractId, receiptId, customerId, roomId } = data;

		const [room, building, contract, depositReceipt, customer] = await Promise.all([
			Entity.RoomsEntity.exists({ _id: roomId }),
			Entity.BuildingsEntity.exists({ _id: buildingId }),
			Entity.ContractsEntity.exists({ _id: contractId }),
			Entity.ReceiptsEntity.exists({ _id: receiptId }),
			Entity.CustomersEntity.exists({ _id: customerId }),
		]);

		if (!building) throw new AppError(errorCodes.notExist, `Tòa nhà với Id: ${buildingId} không tồn tại !`, 404);

		if (!contract) throw new AppError(errorCodes.notExist, `Hóa đơn với Id: ${contractId} không tồn tại !`, 404);

		if (!depositReceipt) throw new AppError(errorCodes.notExist, `Hóa đơn đặt cọc với Id: ${receiptId} không tồn tại !`, 404);

		if (!customer) throw new AppError(errorCodes.notExist, `Khách hàng với Id: ${customerId} không tồn tại !`, 404);

		if (!room) throw new AppError(errorCodes.notExist, `Phòng với Id: ${roomId} không tồn tại !`, 404);

		session = await mongoose.startSession();
		session.startTransaction();

		//Cần cập nhật phí chỉ số.
		const [newDepositRefund] = await Entity.DepositRefundsEntity.create(
			[
				{
					room: roomObjectId,
					feesIndex: data.fees,
					feesOther: data.feesOther,
					depositRefundAmount: data.depositRefundAmount,
					isRefundedDeposited: false,
					customerApproved: false,
					creator: data.userId,
					building: buildingId,
					contract: contractId,
					depositReceipt: receiptId,
					contractOwner: customerId,
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

		const [depositRefund] = await Entity.DepositRefundsEntity.aggregate([
			{
				$match: {
					room: roomObjectId,
					isRefundedDeposit: false,
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
								_id: 1,
								roomIndex: 1,
								roomState: 1,
							},
						},
					],
					as: 'room',
				},
			},
			{
				$lookup: {
					from: 'buildings',
					localField: 'building',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								_id: 1,
								buildingName: 1,
								buildingAddress: 1,
							},
						},
					],
					as: 'building',
				},
			},
			{
				$lookup: {
					from: 'contracts',
					localField: 'contract',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								_id: 1,
								contractSignDate: 1,
								contractEndDate: 1,
								contractCode: 1,
							},
						},
					],
					as: 'contract',
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'creator',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								_id: 1,
								fullName: 1,
								role: 1,
							},
						},
					],
					as: 'creator',
				},
			},
			{
				$lookup: {
					from: 'receipts',
					localField: 'depositReceipt',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								_id: 1,
								paidAmount: 1,
							},
						},
					],
					as: 'depositReceipt',
				},
			},
			{
				$lookup: {
					from: 'customers',
					localField: 'contractOwner',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								_id: 1,
								fullName: 1,
								paymentInfo: 1,
							},
						},
					],
					as: 'contractOwner',
				},
			},
			{
				$addFields: {
					room: { $first: '$room' },
					building: { $first: '$building' },
					contract: { $first: '$contract' },
					creator: { $first: '$creator' },
					depositReceipt: {
						$first: '$depositReceipt',
					},
					contractOwner: { $first: '$contractOwner' },
					depositReceipt: { $first: '$depositReceipt' },
				},
			},
		]);

		if (!depositRefund) throw new AppError(errorCodes.notExist, "Deposit refund doesn't exist", 404);

		cb(null, depositRefund);
	} catch (error) {
		next(error);
	}
};

exports.modifyDepositRefund = async (data, cb, next) => {
	try {
		const depositRefundObjectId = mongoose.Types.ObjectId(data.depositRefundId);

		const getDepositRefund = await Entity.DepositRefundsEntity.findOne({ _id: depositRefundObjectId });
		if (!getDepositRefund) throw new AppError(errorCodes.notExist, "Deposit refund doesn't exist", 404);
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
