const { RESOURCE_ID_MAP } = require('../constants/resources');
const { InternalError, BadRequestError } = require('../AppError');
const { VALIDATE_SOURCE } = require('../constants/resources');

function resolveResourceId(req, resourceType, ValidateSource = VALIDATE_SOURCE['PARAMS']) {
	const paramKey = RESOURCE_ID_MAP[resourceType];

	if (!paramKey) {
		throw new InternalError(`Unknown resourceType: ${resourceType}`);
	}

	const id = req[ValidateSource][paramKey];

	if (!id) {
		throw new BadRequestError(`Missing param :${paramKey}`);
	}

	return id;
}

module.exports = resolveResourceId;
