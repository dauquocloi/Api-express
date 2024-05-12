const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { query } = require('express');

// get All Rooms by building name

exports.getAll = (data, cb) => {
	console.log(data);
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			queryBuilding = Entity.BuildingsEntity.aggregate(
				[
					{
						$match: {
							buildingname: data.buildingname,
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
							preserveNullAndEmptyArrays: true,
						},
					},
					{
						$lookup: {
							from: 'customers',
							localField: 'roomInfo._id',
							foreignField: 'room',
							as: 'customersInfo',
						},
					},
					{
						$lookup: {
							from: 'services',
							localField: 'roomInfo._id',
							foreignField: 'room',
							as: 'servicesInfo',
						},
					},
					{
						$lookup: {
							from: 'payments',
							localField: 'roomInfo._id',
							foreignField: 'room',
							as: 'paymentsInfo',
						},
					},
					{
						$group: {
							_id: {
								_id: '$_id',
								buildingname: '$buildingname',
								buildingadress: '$buildingadress',
								roomquantity: '$roomquantity',
								ownername: '$ownername',
								ownerphonenumber: '$ownerphonenumber',
								managername: '$managername',
								managerphonenumber: '$managerphonenumber',
							},
							roomInfo: {
								$push: {
									_id: '$roomInfo._id',
									motobikequantity: '$roomInfo.motobikequantity',
									roomtoilet: '$roomInfo.roomtoilet',
									dryingyard: '$roomInfo.dryingyard',
									roomstate: '$roomInfo.roomstate',
									opentimes: '$roomInfo.opentimes',
									pet: '$roomInfo.pet',
									roomindex: '$roomInfo.roomindex',
									roomprice: '$roomInfo.roomprice',
									roomdeposit: '$roomInfo.roomdeposit',
									roomtypes: '$roomInfo.roomtypes',
									roomacreage: '$roomInfo.roomacreage',
									servicesInfo: {
										$arrayElemAt: ['$servicesInfo', 0],
									},
									paymentsInfo: {
										$arrayElemAt: ['$paymentsInfo', 0],
									},
									customersInfo: '$customersInfo',
								},
							},
						},
					},
					{
						$project: {
							_id: '$_id._id',
							buildingname: '$_id.buildingname',
							buildingadress: '$_id.buildingadress',
							roomquantity: '$_id.roomquantity',
							ownername: '$_id.ownername',
							ownerphonenumber: '$_id.ownerphonenumber',
							managername: '$_id.managername',
							managerphonenumber: '$_id.managerphonenumber',
							roomInfo: '$roomInfo',
						},
					},
				],
				cb,
			);
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.getallbyindex = (data, cb) => {
	let buildingId;
	let roomId;
	let queryRooms;
	let queryBuilding;
	let queryServices;
	let queryPayment;
	MongoConnect.Connect(config.database.name)
		.then(async (db) => {
			queryBuilding = await Entity.BuildingsEntity.findOne({ buildingname: data.buildingname }).exec();
			buildingId = queryBuilding._id;
			console.log('this is log of buildingId ', queryBuilding);
		})
		.then(async () => {
			queryRooms = await Entity.RoomsEntity.findOne({ building: buildingId, roomindex: data.roomindex }).exec();
			roomId = queryRooms._id;
			console.log(roomId);
		})
		.then(async () => {
			queryServices = await Entity.ServicesEntity.findOne({ room: roomId }).exec();
		})
		.then(async () => {
			queryPayment = await Entity.PaymentsEntity.findOne({ room: roomId }).exec();
		})
		.then(async () => {
			queryCustomers = await Entity.CustomersEntity.find({ room: roomId }).exec();
		})
		.then(() => {
			let result = {
				room: queryRooms,
				service: queryServices,
				payment: queryPayment,
				customer: queryCustomers,
			};
			cb(null, result);
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
		.then(() => {
			let PaymentUpdated = Entity.PaymentsEntity.updateOne(
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
