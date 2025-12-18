const { errorCodes, responseStatus } = require('../constants/errorCodes');

class ApiResponse {
	constructor(errorCode, message, status) {
		this.errorCode = errorCode;
		this.status = status;
		this.message = message;
	}

	send(res) {
		return res.status(this.status).json({
			errorCode: this.errorCode,
			message: this.message,
			data: this.data || null,
		});
	}
}

class AccessTokenErrorResponse extends ApiResponse {
	constructor(message = 'Access token invalid') {
		super(errorCodes.invalidAccessToken, message, responseStatus.UNAUTHORIZED);
	}
}

class AuthFailureResponse extends ApiResponse {
	constructor(message = 'Unauthorized') {
		super(errorCodes.unauthorized, message, responseStatus.UNAUTHORIZED);
	}
}

class BadRequestResponse extends ApiResponse {
	constructor(message = 'Bad Request') {
		super(errorCodes.failure, message, responseStatus.BAD_REQUEST);
	}
}

class ConflictResponse extends ApiResponse {
	constructor(message = 'Data Conflict') {
		super(errorCodes.conflict, message, responseStatus.CONFLICT);
	}
}

class SuccessResponse extends ApiResponse {
	constructor(message = 'Success', data = null) {
		super(errorCodes.success, message, responseStatus.SUCCESS);
		this.data = data;
	}
}

class SuccessMsgResponse extends ApiResponse {
	constructor(message = 'Success') {
		super(errorCodes.success, message, responseStatus.SUCCESS);
	}
}

class FailureMsgResponse extends ApiResponse {
	constructor(message = 'Failure') {
		super(errorCodes.failure, message, responseStatus.SUCCESS);
	}
}

class ForbiddenResponse extends ApiResponse {
	constructor(message = 'Forbidden') {
		super(errorCodes.permissionDenied, message, responseStatus.FORBIDDEN, null);
	}
}

class NotFoundResponse extends ApiResponse {
	constructor(message = 'Not Found') {
		super(errorCodes.notExist, message, responseStatus.NOT_FOUND);
	}
}

class InvalidInputResponse extends ApiResponse {
	constructor(message = 'Invalid Input') {
		super(errorCodes.invalidInput, message, responseStatus.BAD_REQUEST);
	}
}

class InternalServerErrorResponse extends ApiResponse {
	constructor(message = 'Internal Server Error') {
		super(errorCodes.serverDown, message, responseStatus.INTERNAL_SERVER_ERROR);
	}
}

module.exports = {
	AccessTokenErrorResponse,
	AuthFailureResponse,
	BadRequestResponse,
	ConflictResponse,
	FailureMsgResponse,
	ForbiddenResponse,
	SuccessResponse,
	SuccessMsgResponse,
	InvalidInputResponse,
	InternalServerErrorResponse,
	NotFoundResponse,
};
