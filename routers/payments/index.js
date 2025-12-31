const schema = require('./schema');
const express = require('express');
const Payments = require('./payments');
const router = express.Router();
const { validator } = require('../../utils/validator');
const { ValidateSource } = require('../../utils/validator');
const apiKeyAuth = require('../../auth/apiKeyAuthentication');

router.post('/socket', Payments.testSocket);
router.post('/payment', Payments.weebhookPayment);

module.exports = router;
