const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Revenues = require('./revenues');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');

const router = express.Router();
router.use(authentication);
router.get(
	'/',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getAllRevenues, ValidateSource.QUERY),
	Revenues.getRevenues,
);
router.get(
	'/fees',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getFees, ValidateSource.QUERY),
	Revenues.getTotalFeeRevenue,
);

module.exports = router;
