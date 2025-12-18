const { StatusCodes } = require('http-status-codes');
const { AppError, errorTypes, InternalError } = require('../AppError');
const logger = require('../utils/logger');
const { parseMongoError } = require('../utils/mongoErrorParser');

const errorMidlewares = (err, req, res, next) => {
	console.log('log of error from midleware: ', err.stack, err.message, err.type);

	if (err instanceof AppError) {
		AppError.handle(err, res);
		if (err.type === errorTypes.internal) logger.error(`500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
	} else {
		logger.error(`500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
		logger.error(err);
		// CRASH THIS
		// if ('development') {
		// 	res.status(500).send(err);
		// }
		AppError.handle(new InternalError(), res);
	}
	// if (err.name?.includes('Mongo') || err.name === 'CastError' || err.name === 'ValidationError' || err.code === 11000) {
	// 	const mongoErr = parseMongoError(err);

	// 	return res.status(mongoErr.statusCode).json({
	// 		message: mongoErr.message,
	// 		errorCode: mongoErr.errorCode,
	// 	});
	// } else {
	// 	// CRASH
	// 	return res.status(statusCode).json({
	// 		message: 'Hệ thống hiện tại đang bận, vui lòng quay lại sau.',
	// 		errorCode,
	// 	});
	// }
};

module.exports = errorMidlewares;
