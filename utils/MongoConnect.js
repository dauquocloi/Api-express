'use strict';

var mongoose = require('mongoose');
global.config = require('../config');

var db;

exports.Connect = function (dbName) {
	return new Promise(function (resolve, reject) {
		if (db) {
			if (db.name == dbName) {
				resolve(db);
				return;
			} else {
				console.log('Close database [' + db.name + ']');
				db.close();
			}
		}
		mongoose.Promise = global.Promise;

		// create connection string
		// MongoDB Atlas URI
		const dbUsername = encodeURIComponent(config.database.username);
		const dbPassword = encodeURIComponent(config.database.password); // đảm bảo escape ký tự đặc biệt
		const connectionString = `mongodb+srv://${dbUsername}:${dbPassword}@${config.database.clusterUrl}/${dbName}?retryWrites=true&w=majority&appName=${config.database.appName}`;

		console.log('MongoDB URI:', connectionString);

		// connect to database
		mongoose
			.connect(connectionString)
			.then(() => {
				db = mongoose.connection;
				console.log('MongoDb connection created to [' + db.name + ']');
				resolve(db);
			})
			.catch((err) => {
				console.log('Error creating MongoDb connection: ' + err);
				reject(err);
			});
	});
};
