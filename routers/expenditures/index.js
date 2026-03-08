const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Expenditures = require('./expenditures');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const { checkIdempotency } = require('../../middleware/idempotency');
const ROLES = require('../../constants/userRoles');
const { RESOURCES } = require('../../constants/resources');
const { buildingPermissions: POLICY } = require('../../constants/buildings');
const { VALIDATE_SOURCE: RESOURCE_VS } = require('../../constants/resources');

const router = express.Router();

//====================//
router.use(authentication);
//====================//

router.get(
	'/',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getAllExpenditures, ValidateSource.QUERY),
	Expenditures.getExpenditures,
);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.createExpenditure, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['buildings'], POLICY['MANAGER_ADD_EXPENDITURE'], RESOURCE_VS['BODY']),
	checkIdempotency,
	Expenditures.createExpenditure,
);

router.patch(
	'/:expenditureId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyExpenditure, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['expenditures']),
	checkIdempotency,
	Expenditures.modifyExpenditure,
);
router.delete(
	'/:expenditureId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['expenditures']),
	Expenditures.deleteExpenditure,
);

module.exports = router;
