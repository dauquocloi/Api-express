/**
 * configType = 0 is Development environment
 * configType = 1 is Production environment
 */
var home = require('os').homedir();
var configType = 0;
var path = require('path');

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
			host: 'localhost',
			port: 27017,
			name: 'Test_app_nhatro',
			username: '',
			password: '',
			optional: '',
		};
		break;
}
