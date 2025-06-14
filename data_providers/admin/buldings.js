const mongoose = require('mongoose');
const MongoConnect = require('../../utils/MongoConnect');
var Entity = require('../../models');

exports.createBuilding = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
	} catch (error) {
		next(error);
	}
};
