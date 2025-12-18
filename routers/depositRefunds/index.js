const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const DepositRefunds = require('./depositRefunds');
const authentication = require('../../auth/authentication');

const router = express.Router();

// router.use(authentication);
router.get('/', DepositRefunds.getDepositRefunds);
router.get('/:depositRefundId', DepositRefunds.getDepositRefundDetail);
router.post('/', DepositRefunds.generateDepositRefund);
router.post('/confirm', DepositRefunds.confirmDepositRefund);
router.patch('/:depositRefundId', DepositRefunds.modifyDepositRefund);

module.exports = router;
