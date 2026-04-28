// FILE: src/config/redisClient.js
const Redis = require('ioredis');

var REDIS_CONFIG = {
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT,
	user: process.env.REDIS_USER,
	password: process.env.REDIS_PASSWORD,
	maxRetriesPerRequest: null, // Since bull v4
	enableReadyCheck: false, // Since bull v4
};
var client = new Redis(REDIS_CONFIG);
var subscriber = new Redis(REDIS_CONFIG);

client.on('connect', () => {
	console.log('✅ Redis connected');
});

client.on('ready', () => {
	console.log('🚀 Redis ready');
});

client.on('error', (err) => {
	console.error('❌ Redis error:', err);
});

client.on('reconnecting', () => {
	console.log('🔄 Redis reconnecting...');
});

const opts = {
	createClient: function (type) {
		switch (type) {
			case 'client':
				return client;
			case 'subscriber':
				return subscriber;

			default:
				return new Redis(REDIS_CONFIG);
		}
	},
};

module.exports = { client, subscriber, opts };
