const { RESOURCE_ID_MAP } = require('../constants/resources');
const { InternalError, BadRequestError } = require('../AppError');

function resolveResourceId(req, resourceType, ValidateSource = 'params') {
	const paramKey = RESOURCE_ID_MAP[resourceType];

	if (!paramKey) {
		throw new InternalError(`Unknown resourceType: ${resourceType}`);
	}

	const id = req.params[paramKey];

	if (!id) {
		throw new BadRequestError(`Missing param :${paramKey}`);
	}

	return id;
}

module.exports = resolveResourceId;
