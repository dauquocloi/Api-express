const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { query } = require('express');
const uploadImage = require('../utils/uploadImage');

// const config = require('../config'); // Điều này sẽ nạp `cloudinary` đã được export

// get All Rooms by building name

// exports.getAll = (data, cb) => {
// 	console.log(data);
// 	MongoConnect.Connect(config.database.name)
// 		.then((db) => {
// 			queryBuilding = Entity.BuildingsEntity.aggregate(
// 				[
// 					{
// 						$match: {
// 							buildingname: data.buildingname,
// 						},
// 					},
// 					{
// 						$lookup: {
// 							from: 'rooms',
// 							localField: '_id',
// 							foreignField: 'building',
// 							as: 'roomInfor',
// 						},
// 					},
// 					{
// 						$unwind: '$roomInfor',
// 					},
// 					{
// 						$lookup: {
// 							from: 'services',
// 							localField: 'roomInfor.service',
// 							foreignField: '_id',
// 							as: 'servicesInfor',
// 						},
// 					},
// 					{
// 						$lookup: {
// 							from: 'customers',
// 							localField: 'roomInfor._id',
// 							foreignField: 'room',
// 							as: 'customersInfor',
// 						},
// 					},
// 					{
// 						$lookup: {
// 							from: 'payments',
// 							localField: 'roomInfor._id',
// 							foreignField: 'room',
// 							as: 'paymentsInfor',
// 						},
// 					},

// 					{
// 						$group: {
// 							_id: {
// 								_id: '$_id',
// 								buildingadress: '$buildingadress',
// 								buildingname: '$buildingname',
// 								managername: '$managername',
// 								managerphone: '$managerphonenumber',
// 								ownername: '$ownername',
// 								ownerphone: '$ownerphonenumber',
// 							},
// 							roomInfor: {
// 								$push: {
// 									_id: '$roomInfor._id',
// 									motobikequantity: '$roomInfor.motobikequantity',
// 									roomtoilet: '$roomInfor._roomtoilet',
// 									dryingyard: '$roomInfor.dryingyard',
// 									roomstate: '$roomInfor.roomstate',
// 									opentime: '$roomInfor.opentime',
// 									pet: '$roomInfor.pet',
// 									roomindex: '$roomInfor.roomindex',
// 									roomprice: '$roomInfor.roomprice',
// 									roomdeposit: '$roomInfor.roomdeposit',
// 									roomtypes: '$roomInfor.roomtypes',
// 									roomacreage: '$roomInfor.roomacreage',
// 									serviceInfor: {
// 										$arrayElemAt: ['$servicesInfor', 0],
// 									},
// 									paymentInfor: {
// 										$arrayElemAt: ['$paymentsInfor', 0],
// 									},
// 									customersInfor: '$customersInfor',
// 								},
// 							},
// 						},
// 					},
// 				],
// 				cb,
// 			);
// 		})
// 		.catch((err) => {
// 			console.log('rooms_Dataprovider_create: ' + err);
// 			cb(err, null);
// 			console.log('null');
// 		});
// };

//this is peace of shit
// exports.getAll = (data, cb) => {
// 	MongoConnect.Connect(config.database.name).then((db) => {
// 		try {
// 			Entity.BuildingsEntity.aggregate(
// 				[
// 					{
// 						$match: {
// 							buildingName: data.buildingName,
// 						},
// 					},
// 					{
// 						$lookup: {
// 							from: 'rooms',
// 							localField: '_id',
// 							foreignField: 'building',
// 							as: 'roomInfo',
// 						},
// 					},
// 					{
// 						$unwind: {
// 							path: '$roomInfo',
// 						},
// 					},
// 					{
// 						$project: {
// 							_id: '$_id',
// 							roomId: '$roomInfo._id',
// 							roomIndex: '$roomInfo.roomIndex',
// 							roomPrice: '$roomInfo.roomPrice',
// 							roomState: '$roomInfo.roomState',
// 						},
// 					},
// 					{
// 						$group: {
// 							_id: '$_id',
// 							roomInfo: {
// 								$push: {
// 									_id: '$roomId',
// 									roomIndex: '$roomIndex',
// 									roomPrice: '$roomPrice',
// 									roomState: '$roomState',
// 								},
// 							},
// 						},
// 					},
// 				],
// 				cb,
// 			);
// 		} catch (error) {
// 			throw error;
// 		}
// 	});
// };

exports.getAll = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
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
				$project: {
					_id: '$_id',
					roomId: '$roomInfo._id',
					roomIndex: '$roomInfo.roomIndex',
					roomPrice: '$roomInfo.roomPrice',
					roomState: '$roomInfo.roomState',
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

// exports.getRoomById = (data, cb) => {
// 	let roomId = mongoose.Types.ObjectId(`${data.id}`);
// 	MongoConnect.Connect(config.database.name).then((db) => {
// 		Entity.RoomsEntity.aggregate(
// 			[
// 				{
// 					$match: {
// 						_id: roomId,
// 					},
// 				},
// 				{
// 					$lookup: {
// 						from: 'fees',
// 						localField: '_id',
// 						foreignField: 'room',
// 						as: 'feeInfo',
// 					},
// 				},
// 				{
// 					$lookup: {
// 						from: 'contracts',
// 						localField: '_id',
// 						foreignField: 'room',
// 						as: 'contractInfo',
// 					},
// 				},
// 				{
// 					$unwind: {
// 						path: '$contractInfo',
// 					},
// 				},
// 				{
// 					$lookup: {
// 						from: 'customers',
// 						localField: '_id',
// 						foreignField: 'room',
// 						as: 'customerInfo',
// 					},
// 				},
// 				{
// 					$lookup: {
// 						from: 'vehicles',
// 						localField: 'customerInfo._id',
// 						foreignField: 'owner',
// 						as: 'vehicleInfo',
// 					},
// 				},
// 			],
// 			cb,
// 		);
// 	});
// };

exports.getRoom = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const roomId = mongoose.Types.ObjectId(`${data.roomId}`);

		const roomInfo = await Entity.RoomsEntity.aggregate([
			{
				$match: {
					_id: roomId,
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
									$and: [{ $eq: ['$room', '$$roomId'] }],
								},
							},
						},
						{
							$sort: { contractEndDate: -1 },
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
		]);

		if (roomInfo.length > 0) {
			cb(null, roomInfo);
		} else {
			next(new Error('can not find rooms !'));
		}
	} catch (error) {
		next(error);
	}
};

exports.create = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			Entity.RoomsEntity.create(data, cb);
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
		});
};

exports.update = (data, cb) => {
	MongoConnect.Connect(config.database.name)
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
	MongoConnect.Connect(config.database.name).then(async (db) => {
		roomUpdated = Entity.RoomsEntity.updateOne({ _id: data.roomId }, {});
	});
};

// lấy thông tin tài chính của Phòng
exports.finance = (data, cb) => {
	var roomId = mongoose.Types.ObjectId(`${data.roomId}`);
	let queryRooms;
	MongoConnect.Connect(config.database.name).then((db) => {
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
		const db = MongoConnect.Connect(config.database.name);
		const roomId = mongoose.Types.ObjectId(`${data.roomId}`);
		const roomRecent = await Entity.RoomsEntity.findById(roomId);

		const roomImages = [];
		for (const image of data.imagesRoom) {
			const handleUploadImage = await uploadImage(image?.buffer);
			roomImages.push(handleUploadImage.Key);
		}

		if (roomRecent.roomImage?.ref) {
			roomRecent.roomImage?.ref.push(...roomImages);
		}

		console.log('log of roomRecent: ', roomRecent);
		const importedRoomImages = await roomRecent.save();
		cb(null, importedRoomImages);
	} catch (error) {
		next(error);
	}
};

exports.addInterior = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
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
		const db = MongoConnect.Connect(config.database.name);
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
		const db = MongoConnect.Connect(config.database.name);
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
		const db = MongoConnect.Connect(config.datbase.name);

		if (data.SetUnRentingType == 'early') {
		}
	} catch (error) {
		next(error);
	}
};

exports.getListSelectingRoom = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
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
