const { StatusCodes } = require('http-status-codes');

const errorMidlewares = (err, req, res, next) => {
	const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
	const message = err.message || StatusCodes[statusCode];
	// console.log('Kiem tra err', err);

	res.status(statusCode).json({
		success: false,
		error: {
			message,
			statusCode,
		},
	});
};

module.exports = errorMidlewares;
