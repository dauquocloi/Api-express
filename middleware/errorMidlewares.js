const { StatusCodes } = require('http-status-codes');
const AppError = require('../AppError');

const errorMidlewares = (err, req, res, next) => {
	const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
	const message = err.message || StatusCodes[statusCode];
	const errorCode = err.errorCode || 5001;
	console.error('log of error from midleware: ', err.stack);

	if (err instanceof AppError) {
		return res.status(statusCode).json({
			message,
			errorCode,
		});
	} else {
		// CRASH
		return res.status(statusCode).json({
			message: 'Hệ thống hiện tại đang bận, vui lòng quay lại sau.',
			errorCode,
		});
	}
};

module.exports = errorMidlewares;
