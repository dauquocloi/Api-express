const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const DepositRefunds = require('./depositRefunds');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');
const router = express.Router();

router.use(authentication);
router.get('/', validator(schema.getAllDepositRefunds, ValidateSource.QUERY), DepositRefunds.getDepositRefunds);
router.get('/:depositRefundId', validator(schema.id, ValidateSource.PARAM), DepositRefunds.getDepositRefundDetail);
router.post('/', validator(schema.createDepositRefund, ValidateSource.BODY), DepositRefunds.generateDepositRefund);

router.post(
	'/:depositRefundId/confirm',
	authorization(ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	DepositRefunds.confirmDepositRefund,
);
router.patch('/:depositRefundId', validator(schema.id, ValidateSource.PARAM), DepositRefunds.modifyDepositRefund);
router.patch('/:depositRefundId/workflow/on-editting'); // Role này để mở các hóa đơn chưa chưa thanh toán đã bị khóa
router.delete('/:depositRefundId/debts', validator(schema.id, ValidateSource.PARAM), DepositRefunds.removeDebtsFromDepositRefund);
router.get('/:depositRefundId/modify-info', validator(schema.id, ValidateSource.PARAM), DepositRefunds.getModifyDepositRefundInfo);

module.exports = router;
