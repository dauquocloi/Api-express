const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 phút
	max: 100, // 100 request / IP / window
	message: {
		status: 429,
		message: 'Too many requests, please try again later.',
	},
	standardHeaders: true,
	legacyHeaders: false,
});

module.exports = apiLimiter;
