const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const CheckoutCosts = require('./checkoutCosts.js');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');

const router = express.Router();

router.use(authentication);
router.get('/:checkoutCostId', validator(schema.id, ValidateSource.PARAM), CheckoutCosts.getCheckoutCost);
router.get(
	'/:checkoutCostId/modify-info',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	CheckoutCosts.getModifyCheckoutCostInfo,
);
router.delete(
	'/:checkoutCostId/debts',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	CheckoutCosts.removeDebtsFromCheckoutCost,
);
router.patch(
	'/:checkoutCostId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyCheckoutCost, ValidateSource.BODY),
	CheckoutCosts.modifyCheckoutCost,
);
router.delete(
	'/:checkoutCostId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.terminateCheckoutCost, ValidateSource.BODY),
	CheckoutCosts.terminateCheckoutCost,
);

module.exports = router;
