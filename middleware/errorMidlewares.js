const { StatusCodes } = require('http-status-codes');
const { AppError, errorTypes, InternalError } = require('../AppError');
const logger = require('../utils/logger');
const { parseMongoError } = require('../utils/mongoErrorParser');

const errorMidlewares = (err, req, res, next) => {
	console.log('log of error from errorMidlewares: ', err.name, err.stack, err.message, err.type);

	if (err instanceof AppError) {
		AppError.handle(err, res);

		if (err.type === errorTypes.internal) {
			logger.error(`500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
		}

		return;
	}

	if (err.code === 11000 || err.name === 'ValidationError' || err.name === 'CastError') {
		const mongoErr = parseMongoError(err);

		return res.status(mongoErr.statusCode).json({
			message: mongoErr.message,
			errorCode: mongoErr.errorCode,
		});
	}

	// unknown error
	// logger.error(err);

	return AppError.handle(new InternalError(), res);
};

module.exports = errorMidlewares;
