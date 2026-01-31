const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const IncidentalRevenues = require('./incidentalRevenues');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const { checkIdempotency } = require('../../middleware/idempotency');
const RESOURCE = 'incidentalRevenues';

const router = express.Router();

router.use(authentication);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.createIncidentalRevenue, ValidateSource.BODY),
	IncidentalRevenues.createIncidentalRevenue,
);

router.patch(
	'/:incidentalRevenueId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyIncidentalRevenue, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	IncidentalRevenues.modifyIncidentalRevenue,
);

router.delete(
	'/:incidentalRevenueId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	IncidentalRevenues.deleteIncidentalRevenue,
);

module.exports = router;
