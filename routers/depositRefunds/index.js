const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const DepositRefunds = require('./depositRefunds');
const authentication = require('../../auth/authentication');

const router = express.Router();

router.use(authentication);
router.get('/', validator(schema.getAllDepositRefunds, ValidateSource.QUERY), DepositRefunds.getDepositRefunds);
router.get('/:depositRefundId', validator(schema.id, ValidateSource.PARAM), DepositRefunds.getDepositRefundDetail);
router.post('/', validator(schema.createDepositRefund, ValidateSource.BODY), DepositRefunds.generateDepositRefund);

//OWNER
router.post('/:depositRefundId/confirm', validator(schema.id, ValidateSource.PARAM), DepositRefunds.confirmDepositRefund);
router.patch('/:depositRefundId', validator(schema.id, ValidateSource.PARAM), DepositRefunds.modifyDepositRefund);
router.patch('/:depositRefundId/workflow/on-editting'); // Role này để mở các hóa đơn chưa chưa thanh toán đã bị khóa

module.exports = router;
