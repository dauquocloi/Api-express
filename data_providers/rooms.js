const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { query } = require('express');
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

exports.getAll = (data, cb) => {
	MongoConnect.Connect(config.database.name).then((db) => {
		try {
			Entity.BuildingsEntity.aggregate(
				[
					{
						$match: {
							buildingName: data.buildingName,
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
				],
				cb,
			);
		} catch (error) {
			throw error;
		}
	});
};

exports.getRoomById = (data, cb) => {
	let roomId = mongoose.Types.ObjectId(`${data.id}`);
	MongoConnect.Connect(config.database.name).then((db) => {
		Entity.RoomsEntity.aggregate(
			[
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
						localField: '_id',
						foreignField: 'room',
						as: 'contractInfo',
					},
				},
				{
					$unwind: {
						path: '$contractInfo',
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
			],
			cb,
		);
	});
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
