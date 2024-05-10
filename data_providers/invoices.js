const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { TestUsersEntity } = require('../models/contracts');
const { last, result } = require('underscore');

exports.getAll = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			// do things here
			Entity.ContractsEntity.find({}, cb);
			// Entity.RoomsEntity.aggregate([{ $lookup: { from: 'users', localField: '' } }])
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.create = (data, cb) => {
	let BuildingIdByName;
	let RoomIdByIndex;
	let findBuildingByName;
	let findRoomsByBuildingId;
	let invoiceCreate;
	MongoConnect.Connect(config.database.name)

		.then(async (db) => {
			// find Building by Building name
			findBuildingByName = await Entity.BuildingsEntity.findOne({ buildingname: data.buildingname }).exec();
			BuildingIdByName = findBuildingByName._id;
			console.log('this is log of findBuildingByName', BuildingIdByName);

			// find Rooms by BuildingId and roomindex
			findRoomsByBuildingId = await Entity.RoomsEntity.findOne({ building: BuildingIdByName, roomindex: data.roomindex }).exec();
			RoomIdByIndex = findRoomsByBuildingId._id;
		})
		.then(async () => {
			let invoiceCreate = await Entity.InvoicesEntity.create({
				room: RoomIdByIndex,
				firstelecnumber: data.firstelecnumber,
				lastelecnumber: data.lastelecnumber,
				firstwaternumber: data.firstwaternumber,
				lastwaternumber: data.lastwaternumber,
				waterprice: data.waterprice,
				motobike: data.motobike,
				elevator: data.elevator,
				daystay: data.daystay,
				period: data.period,
			});
			cb(null, 'good job em');
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
		});
};

exports.updateTest = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			Entity.InvoicesEntity.updateOne({ id: 118 }, { roomid: data.room.roomid }, { new: true }, cb);
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
		});
};
