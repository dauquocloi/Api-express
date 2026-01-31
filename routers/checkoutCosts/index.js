const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const CheckoutCosts = require('./checkoutCosts.js');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const RESOURCE = 'checkoutCosts';

const router = express.Router();

//==================//
router.use(authentication);
//==================//

router.get(
	'/:checkoutCostId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	CheckoutCosts.getCheckoutCost,
);

router.get(
	'/:checkoutCostId/modify-info',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	CheckoutCosts.getModifyCheckoutCostInfo,
);
router.delete(
	'/:checkoutCostId/debts',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	CheckoutCosts.removeDebtsFromCheckoutCost,
);
router.patch(
	'/:checkoutCostId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyCheckoutCost, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	CheckoutCosts.modifyCheckoutCost,
);
router.delete(
	'/:checkoutCostId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.terminateCheckoutCost, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	CheckoutCosts.terminateCheckoutCost,
);

module.exports = router;
