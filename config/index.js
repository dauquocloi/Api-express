/**
 * configType = 0 is Development environment
 * configType = 1 is Production environment
 */
var home = require('os').homedir();
var configType = 0;
var path = require('path');
var cloudinary = require('./cloudinary');
require('dotenv').config;

switch (configType) {
	case 0: // Development environment
		exports.ENV = 'DEVELOPMENT';

		exports.server = {
			port: 3701,
			porthttps: 3702,
			accessTokenSecretKey: 'access-secet-key',
			accessTokenExpiryTime: 60, // 1-minute
			refreshTokenSecretKey: 'refresh-secet-key',
			refreshTokenExpiryTime: 2592000, // 1-month
			base_url: 'http://localhost/',
			limiterMaxTime: 1 * 60 * 1000,
			limiterMaxRequestNormal: 100,
			limiterMaxRequestMedium: 10,
			limiterMaxRequestHard: 1,
			maxDuration: 10000, // ms
		};
		exports.database = {
			// host: 'localhost',
			// port: 27017,
			username: process.env.ATLAS_USERNAME,
			password: process.env.ATLAS_PASSWORD,
			clusterUrl: process.env.ATLAS_URL,
			appName: 'Cluster0-ProjectA-Qltro',
			// optional: 'retryWrites=false',
		};
		exports.JWT = {
			JWT_SECRET: process.env.JWT_SECRET,
			JWT_REFRESH: process.env.JWT_REFRESH,
		};
		exports.cloudinary = cloudinary;
		break;
}
