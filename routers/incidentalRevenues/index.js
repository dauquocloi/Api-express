const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const IncidentalRevenues = require('./incidentalRevenues');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const { checkIdempotency } = require('../../middleware/idempotency');
const { RESOURCES } = require('../../constants/resources');
const { buildingPermissions: POLICY } = require('../../constants/buildings');
const { VALIDATE_SOURCE: RESOURCE_VS } = require('../../constants/resources');

const router = express.Router();

router.use(authentication);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.createIncidentalRevenue, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['buildings'], POLICY['MANAGER_ADD_INCIDENTAL_INCOME'], RESOURCE_VS['BODY']),
	checkIdempotency,
	IncidentalRevenues.createIncidentalRevenue,
);

router.patch(
	'/:incidentalRevenueId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyIncidentalRevenue, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['incidentalRevenues']),
	IncidentalRevenues.modifyIncidentalRevenue,
);

router.delete(
	'/:incidentalRevenueId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['incidentalRevenues']),
	IncidentalRevenues.deleteIncidentalRevenue,
);

module.exports = router;
