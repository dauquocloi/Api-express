const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const config = require('../config'); // Điều này sẽ nạp `cloudinary` đã được export

exports.uploadFiles = (data, cb) => {
	let path = data.path;
	MongoConnect.Connect(config.database.fullname).then((db) => {
		Entity.FilesEntity.create({ path }, cb);
	});
};
