const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const { combine, timestamp, printf, colorize } = winston.format;

// Format log: [2025-01-01 12:00:00] level: message
const logFormat = printf(({ level, message, timestamp }) => {
	return `[${timestamp}] ${level}: ${message}`;
});

// Logger configuration
const logger = winston.createLogger({
	level: 'info', // "error", "warn", "info", "http", "debug"
	format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
	transports: [
		// Ghi vào console (dev)
		new winston.transports.Console({
			format: combine(colorize(), logFormat),
		}),

		// Log error riêng
		new DailyRotateFile({
			dirname: 'logs',
			filename: 'error-%DATE%.log',
			datePattern: 'YYYY-MM-DD',
			level: 'error',
			maxFiles: '30d',
		}),

		// Log tổng hợp
		new DailyRotateFile({
			dirname: 'logs',
			filename: 'combined-%DATE%.log',
			datePattern: 'YYYY-MM-DD',
			maxFiles: '30d',
		}),
	],
});

module.exports = logger;
