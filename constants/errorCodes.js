exports.NOT_EXIST = 40004;
exports.CANCELLED = 40010;

//CHANGE => STATUS CODE
exports.errorCodes = {
	success: 0,
	processing: 20002,
	failure: 10001,
	invalidAccessToken: 10003,
	notExist: 40004,
	cancelled: 40010,
	invariantViolation: 50001,
	serverDown: 50000,
	conflict: 40009,
	invalidInput: 40000,
	unauthorized: 40001,
	permissionDenied: 40003,
	tooManyRequest: 40029,
};

exports.responseStatus = {
	SUCCESS: 200,
	PROCESSING: 202,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	INTERNAL_SERVER_ERROR: 500,
	CONFLICT: 409,
	TOO_MANY_REQUEST: 429,
};
