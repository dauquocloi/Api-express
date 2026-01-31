const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Customers = require('./customers');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const { checkIdempotency } = require('../../middleware/idempotency');
const RESOURCE = 'customers';
const router = express.Router();

//===================//
router.use(authentication);
//===================//

router.get(
	'/',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getAllCustomers, ValidateSource.QUERY),
	Customers.getAllCustomers,
);

router.get(
	'/list-selections',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getListSelections, ValidateSource.QUERY),
	Customers.getListSelectingCustomer,
);

router.post(
	'/',
	authorization(ROLES['MANAGER'], ROLES['OWNER']),
	validator(schema.createCustomer, ValidateSource.BODY),
	checkIdempotency,
	Customers.addCustomer,
);

router.patch(
	'/:customerId',
	authorization(ROLES['MANAGER'], ROLES['OWNER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyCustomer, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Customers.editCustomer,
);

router.patch(
	'/:customerId/status',
	authorization(ROLES['MANAGER'], ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess,
	Customers.setCustomerStatus,
);

module.exports = router;
