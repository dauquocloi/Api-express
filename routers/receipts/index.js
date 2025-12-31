const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Receipts = require('./receipts');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');
const checkIdempotency = require('../../middleware/idempotency');

const router = express.Router();

router.use(authentication);

router.get('/', validator(schema.getAllReceipts, ValidateSource.QUERY), Receipts.getListReceiptPaymentStatus);

router.get('/:receiptId', validator(schema.id, ValidateSource.PARAM), Receipts.getReceiptDetail);

router.post('/', validator(schema.createReceipt, ValidateSource.BODY), Receipts.createReceipt);

router.post('/deposit-receipt', validator(schema.createDepositReceipt, ValidateSource.BODY), Receipts.createDepositReceipt);

router.get('/:receiptId/deposit', validator(schema.id, ValidateSource.PARAM), Receipts.getDepositReceiptDetail);

router.patch('/:receiptId', validator(schema.id, ValidateSource.PARAM), validator(schema.modifyReceipt, ValidateSource.BODY), Receipts.modifyReceipt);

router.post(
	'/:receiptId/collect-cash',
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.collectCash, ValidateSource.BODY),
	Receipts.collectCashMoney,
);
router.delete(
	'/:receiptId',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.deleteReceipt, ValidateSource.BODY),
	Receipts.deleteReceipt,
);
router.post('/debt-receipt', validator(schema.createReceipt, ValidateSource.BODY), Receipts.createDebtsReceipt);

module.exports = router;
