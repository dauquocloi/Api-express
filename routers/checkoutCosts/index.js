const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const CheckoutCosts = require('./checkoutCosts.js');
const authentication = require('../../auth/authentication');

const router = express.Router();

router.get('/:checkoutCostId', validator(schema.id, ValidateSource.PARAM), CheckoutCosts.getCheckoutCost);

module.exports = router;
