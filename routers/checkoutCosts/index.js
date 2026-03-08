const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const CheckoutCosts = require('./checkoutCosts.js');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const { checkIdempotency } = require('../../middleware/idempotency.js');
const ROLES = require('../../constants/userRoles');
const { RESOURCES } = require('../../constants/resources.js');

const router = express.Router();

//==================//
router.use(authentication);
//==================//

router.get(
	'/:checkoutCostId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['checkoutCosts']),
	CheckoutCosts.getCheckoutCost,
);

router.get(
	'/:checkoutCostId/modify-info',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['checkoutCosts']),
	CheckoutCosts.getModifyCheckoutCostInfo,
);
router.delete(
	'/:checkoutCostId/debts',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['checkoutCosts']),
	CheckoutCosts.removeDebtsFromCheckoutCost,
);
router.patch(
	'/:checkoutCostId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyCheckoutCost, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['checkoutCosts']),
	checkIdempotency,
	CheckoutCosts.modifyCheckoutCost,
);
router.delete(
	'/:checkoutCostId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.terminateCheckoutCost, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['checkoutCosts']),
	CheckoutCosts.terminateCheckoutCost,
);

module.exports = router;
