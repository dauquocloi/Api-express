const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');

exports.getFeesByRoomId = (data, cb) => {
	let roomId = mongoose.Types.ObjectId(`${data}`);
	MongoConnect.Connect(config.database.name).then(async (db) => {
		await Entity.FeesEntity.find({ room: roomId }, cb);
	});
};
