const { StatusCodes } = require('http-status-codes');

const errorMidlewares = (err, req, res, next) => {
	const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
	const message = err.message || StatusCodes[statusCode];
	const errorCode = err.errorCode || 5001;
	console.error('Lỗi: ', err);

	res.status(statusCode).json({
		message,
		errorCode,
	});
};

module.exports = errorMidlewares;
