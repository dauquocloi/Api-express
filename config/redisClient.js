const Redis = require('ioredis');

const isTest = process.env.NODE_ENV === 'test';

const REDIS_CONFIG = {
	host: process.env.REDIS_HOST || '127.0.0.1',
	port: Number(process.env.REDIS_PORT || 6379),
	username: process.env.REDIS_USER || undefined,
	password: process.env.REDIS_PASSWORD || undefined,

	maxRetriesPerRequest: null,
	enableReadyCheck: false,

	// Chỉ áp dụng cho môi trường test.
	...(isTest && {
		lazyConnect: true,
		retryStrategy: () => null,
	}),
};

const client = new Redis(REDIS_CONFIG);
const subscriber = new Redis(REDIS_CONFIG);

const clients = new Set([client, subscriber]);

function trackClient(redis) {
	clients.add(redis);
	return redis;
}

function attachListeners(redis, name) {
	redis.on('connect', () => {
		if (!isTest) console.log(`${name}: Redis connected`);
	});

	redis.on('ready', () => {
		if (!isTest) console.log(`${name}: Redis ready`);
	});

	redis.on('error', (err) => {
		if (!isTest) console.error(`${name}: Redis error:`, err);
	});

	redis.on('reconnecting', () => {
		if (!isTest) console.log(`${name}: Redis reconnecting...`);
	});
}

attachListeners(client, 'client');
attachListeners(subscriber, 'subscriber');

const opts = {
	createClient(type) {
		switch (type) {
			case 'client':
				return client;

			case 'subscriber':
				return subscriber;

			default:
				return trackClient(new Redis(REDIS_CONFIG));
		}
	},
};

// Dùng khi teardown test hoặc shutdown ứng dụng.
async function closeRedis() {
	const closingClients = [...clients];

	await Promise.all(
		closingClients.map(async (redis) => {
			if (redis.status === 'end') return;

			redis.disconnect();
		}),
	);

	clients.clear();
}

module.exports = {
	client,
	subscriber,
	opts,
	closeRedis,
};
