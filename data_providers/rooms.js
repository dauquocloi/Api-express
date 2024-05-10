const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { query } = require('express');

// get All Rooms by building name
exports.getAll = (data, cb) => {
	let buildingId;
	let roomId;
	let queryRooms;
	let queryBuilding;
	let queryCustomer;
	let result;
	MongoConnect.Connect(config.database.name)
		.then(async (db) => {
			// do things here
			queryBuilding = await Entity.BuildingsEntity.findOne({ buildingname: data.buildingname }).exec();
			console.log(queryBuilding);
			buildingId = queryBuilding._id;
		})
		.then(async () => {
			queryRooms = await Entity.RoomsEntity.find({ building: buildingId }).populate('service').populate('payment').exec();
		})
		.then(() => {
			cb(null, { queryRooms });
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
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
						roomprice: data.roomPrice,
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
						generalservice: data.generalService,
						motobike: data.motobike,
						elevator: data.elevator,
						water: data.water,
						electric: data.electric,
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
			cb(null, { result });
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
		});
};
