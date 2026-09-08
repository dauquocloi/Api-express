const {
	AuthFailureResponse,
	AccessTokenErrorResponse,
	BadRequestResponse,
	ConflictResponse,
	InternalServerErrorResponse,
	NotFoundResponse,
	ForbiddenResponse,
	InvalidInputResponse,
} = require('./utils/apiResponse');

const errorTypes = {
	accessToken: 'AccessTokenError',
	badToken: 'BadTokenError',
	badRequest: 'BadRequestError',
	conflict: 'ConflictError',
	tokenExpired: 'TokenExpiredError',
	unauthorized: 'UnauthorizedError',
	internal: 'InternalError',
	invalidInput: 'InvalidInputError',
	forbidden: 'ForbiddenError',
	notFound: 'NotFoundError',
	noData: 'NoDataError',
	noEntry: 'NoEntryError',
	toManyRequest: 'TooManyRequestError',
};

class AppError extends Error {
	constructor(type, message) {
		super(message);

		this.name = type;
		this.type = type;
		this.message = message;

		Error.captureStackTrace?.(this, this.constructor);
	}

	static handle(err, res) {
		switch (err.type) {
			case errorTypes.accessToken:
				return new AccessTokenErrorResponse(err.message).send(res);

			case errorTypes.badToken:
			case errorTypes.unauthorized:
			case errorTypes.tokenExpired:
				return new AuthFailureResponse(err.message).send(res);

			case errorTypes.badRequest:
				return new BadRequestResponse(err.message).send(res);

			case errorTypes.conflict:
				return new ConflictResponse(err.message).send(res);

			case errorTypes.forbidden:
				return new ForbiddenResponse(err.message).send(res);

			case errorTypes.noEntry:
			case errorTypes.notFound:
			case errorTypes.noData:
				return new NotFoundResponse(err.message).send(res);

			case errorTypes.invalidInput:
				return new InvalidInputResponse(err.message).send(res);

			case errorTypes.internal:
				return new InternalServerErrorResponse(err.message).send(res);

			case errorTypes.toManyRequest:
				return new ToManyRequestError(err.message).send(res);

			default: {
				let message = err.message;
				// Do not send failure message in production
				if ('production') message = 'Something wrong happened.';
				return new InternalServerErrorResponse(message).send(res);
			}
		}
	}

	toJSON() {
		return {
			type: this.type,
			message: this.message,
		};
	}

	static fromJSON({ type, message }) {
		const ErrorClass = errorFactories[type] ?? InternalError;

		return new ErrorClass(message);
	}
}

class InternalError extends AppError {
	constructor(message) {
		super(errorTypes.internal, message);
	}
}

class ConflictError extends AppError {
	constructor(message) {
		super(errorTypes.conflict, message);
	}
}

class NoEntryError extends AppError {
	constructor(message = "Entry don't exist") {
		super(errorTypes.noEntry, message);
	}
}

class NoDataError extends AppError {
	constructor(message = 'No data available') {
		super(errorTypes.noData, message);
	}
}

class NotFoundError extends AppError {
	constructor(message = 'Not Found') {
		super(errorTypes.notFound, message);
	}
}

class ForbiddenError extends AppError {
	constructor(message) {
		super(errorTypes.forbidden, message);
	}
}

class InvalidInputError extends AppError {
	constructor(message = 'Invalid Input') {
		super(errorTypes.invalidInput, message);
	}
}

class TokenExpiredError extends AppError {
	constructor(message = 'Token is expired') {
		super(errorTypes.tokenExpired, message);
	}
}

class BadTokenError extends AppError {
	constructor(message = 'Token is not valid') {
		super(errorTypes.unauthorized, message);
	}
}

class BadRequestError extends AppError {
	constructor(message = 'Bad request') {
		super(errorTypes.badRequest, message);
	}
}

class AccessTokenError extends AppError {
	constructor(message = 'Invalid access token') {
		super(errorTypes.accessToken, message);
	}
}

class AuthFailureError extends AppError {
	constructor(message = 'Authentication failed') {
		super(errorTypes.unauthorized, message);
	}
}

class ToManyRequestError extends AppError {
	constructor(message = 'Too many requests') {
		super(errorTypes.toManyRequest, message);
	}
}

class AppErrorFactory {
	static fromSerialized({ type, message }) {
		const ErrorClass = errorFactories[type] ?? InternalError;

		return new ErrorClass(message);
	}
}

const errorFactories = {
	[errorTypes.accessToken]: AccessTokenError,
	[errorTypes.badToken]: BadTokenError,
	[errorTypes.badRequest]: BadRequestError,
	[errorTypes.conflict]: ConflictError,
	[errorTypes.tokenExpired]: TokenExpiredError,
	[errorTypes.unauthorized]: AuthFailureError,
	[errorTypes.internal]: InternalError,
	[errorTypes.invalidInput]: InvalidInputError,
	[errorTypes.forbidden]: ForbiddenError,
	[errorTypes.notFound]: NotFoundError,
	[errorTypes.noData]: NoDataError,
	[errorTypes.noEntry]: NoEntryError,
	[errorTypes.toManyRequest]: ToManyRequestError,
};

module.exports = {
	AppError,
	AuthFailureError,
	AccessTokenError,
	BadTokenError,
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NoEntryError,
	NoDataError,
	NotFoundError,
	InternalError,
	InvalidInputError,
	TokenExpiredError,
	ToManyRequestError,
	errorTypes,
	AppErrorFactory,
};
