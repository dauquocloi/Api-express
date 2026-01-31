const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Expenditures = require('./expenditures');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const RESOURCE = 'expenditures';

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
	Expenditures.createExpenditure,
);

router.patch(
	'/:expenditureId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyExpenditure, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Expenditures.modifyExpenditure,
);
router.delete(
	'/:expenditureId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Expenditures.deleteExpenditure,
);

module.exports = router;
