const { StatusCodes } = require('http-status-codes');

exports.parseMongoError = (err) => {
	// ❗ CastError – ID sai format
	if (err.name === 'CastError') {
		return {
			statusCode: StatusCodes.BAD_REQUEST,
			message: 'Giá trị ID không hợp lệ.',
			errorCode: 6001,
		};
	}

	// ❗ ValidationError – sai schema
	if (err.name === 'ValidationError') {
		return {
			statusCode: StatusCodes.BAD_REQUEST,
			message: err.message,
			errorCode: 6002,
		};
	}

	// ❗ Duplicate key – trùng dữ liệu
	if (err.code === 11000) {
		return {
			statusCode: StatusCodes.CONFLICT,
			message: 'Dữ liệu đã tồn tại trong hệ thống.',
			errorCode: 6003,
		};
	}

	// ❗ Transaction lỗi tạm thời
	if (err.errorLabels?.includes('TransientTransactionError')) {
		return {
			statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
			message: 'Lỗi transaction, vui lòng thử lại.',
			errorCode: 6004,
		};
	}

	// ❗ Commit transaction không chắc chắn
	if (err.errorLabels?.includes('UnknownTransactionCommitResult')) {
		return {
			statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
			message: 'Không chắc chắn về trạng thái commit transaction.',
			errorCode: 6005,
		};
	}

	// ❗ Write Conflict
	if (err.code === 112) {
		return {
			statusCode: StatusCodes.CONFLICT,
			message: 'Xung đột khi ghi dữ liệu (write conflict).',
			errorCode: 6006,
		};
	}

	// ❗ Timeout
	if (err.name === 'MongoNetworkTimeoutError') {
		return {
			statusCode: StatusCodes.GATEWAY_TIMEOUT,
			message: 'Kết nối đến cơ sở dữ liệu bị timeout.',
			errorCode: 6007,
		};
	}

	// ❗ Network Error
	if (err.name && err.name.includes('MongoNetworkError')) {
		return {
			statusCode: StatusCodes.SERVICE_UNAVAILABLE,
			message: 'Không thể kết nối đến cơ sở dữ liệu.',
			errorCode: 6008,
		};
	}

	// ❗ MongoServerError – tổng quát
	if (err.name === 'MongoServerError') {
		return {
			statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
			message: err.message || 'Lỗi máy chủ cơ sở dữ liệu.',
			errorCode: 6009,
		};
	}

	// ❗ Lỗi không xác định – fallback
	return {
		statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
		message: 'Lỗi không xác định từ cơ sở dữ liệu.',
		errorCode: 6999,
	};
};
