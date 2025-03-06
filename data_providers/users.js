const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const utils = require('../utils/HandleText');

exports.getAll = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			// do things here
			Entity.UsersEntity.find({}, cb);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.create = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			Entity.UsersEntity.create(data, cb);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
		});
};

// lấy user by emai
exports.getEmail = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			Entity.UsersEntity.findOne({ email: data.params?.email }).lean().exec(cb);
		})
		.catch((err) => {
			console.log('getEmail error: ' + err);
			cb(err, null);
			console.log('null');
		});
};

// lấy user by email token
exports.getEmailbyToken = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			Entity.CustomersEntity.findOne({ email: data }).lean().exec(cb);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.getByRoomId = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			// do things here
			Entity.UsersEntity.find({}, cb);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.getUserByUserId = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			Entity.UsersEntity.findById(data.id).exec();
			cb;
		})
		.catch((err) => {
			cb(err, null);
			console.log('null');
		});
};

exports.getUserByFullName = (data, cb) => {
	MongoConnect.Connect(config.database.name).then(async (db) => {
		// let message = await utils.removeVietnameseTones(data.message); // xử lý văn bản
		await Entity.UsersEntity.createIndex({ fullname: 1, phonenumber: 1 });
		Entity.UsersEntity.find({ $text: { $search: 'Anh Le' } }, cb);
	});
};
