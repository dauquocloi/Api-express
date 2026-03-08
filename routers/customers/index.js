const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Customers = require('./customers');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const { checkIdempotency } = require('../../middleware/idempotency');
const { RESOURCES, VALIDATE_SOURCE: RESOURCE_VS } = require('../../constants/resources');
const router = express.Router();

//===================//
router.use(authentication);
//===================//

router.get(
	'/',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getAllCustomers, ValidateSource.QUERY),
	checkResourceAccess(RESOURCES['buildings'], null, RESOURCE_VS['QUERY']),
	Customers.getAllCustomers,
);

router.get(
	'/list-selections',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getListSelections, ValidateSource.QUERY),
	checkResourceAccess(RESOURCES['rooms'], null, RESOURCE_VS['QUERY']),
	Customers.getListSelectingCustomer,
);

router.post(
	'/',
	authorization(ROLES['MANAGER'], ROLES['OWNER']),
	validator(schema.createCustomer, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['buildings'], null, RESOURCE_VS['BODY']),
	checkIdempotency,
	Customers.addCustomer,
);

router.patch(
	'/:customerId',
	authorization(ROLES['MANAGER'], ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyCustomer, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['customers']),
	checkIdempotency,
	Customers.editCustomer,
);

router.patch(
	'/:customerId/status',
	authorization(ROLES['MANAGER'], ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.setCustomerStatus, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['customers']),
	checkIdempotency,
	Customers.setCustomerStatus,
);

router.patch(
	'/:customerId/contract-owner',
	authorization(ROLES['MANAGER'], ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['customers']),
	checkIdempotency,
	Customers.changeContractOwner,
);

router.delete(
	'/:customerId',
	authorization(ROLES['MANAGER'], ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['customers']),
	Customers.deleteCustomer,
);

router.get(
	'/:customerId/export-ct01',
	authorization(ROLES['MANAGER'], ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['customers']),
	Customers.exportCT01PdfFile,
);

module.exports = router;
