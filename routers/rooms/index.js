const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Rooms = require('./rooms');
const ROLES = require('../../constants/userRoles');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const RESOURCE = 'rooms';

const router = express.Router();

router.use(authentication);
router.get(
	'/:roomId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Rooms.getRoom,
);
router.post('/:roomId/interiors', validator(schema.id, ValidateSource.PARAM), validator(schema.interiorBody, ValidateSource.BODY), Rooms.addInterior);
router.patch(
	'/:roomId/interiors/:interiorId',
	validator(schema.paramsWithInterior, ValidateSource.PARAM),
	validator(schema.interiorBody, ValidateSource.BODY),
	Rooms.editInterior,
);
router.delete('/:roomId/interiors/:interiorId', validator(schema.paramsWithInterior, ValidateSource.PARAM), Rooms.removeInterior);

// router.post('/:roomId/fees', Rooms.addFee);
// router.post(
// 	'/:roomId/workflows/deposit-and-first-invoice',
// 	validator(schema.id, ValidateSource.PARAM),
// 	validator(schema.generateReceiptInvoiceBody, ValidateSource.BODY),
// 	Rooms.generateDepositReceiptAndFirstInvoice,
// );
router.patch('/:roomId/rent', validator(schema.id, ValidateSource.PARAM), validator(schema.modifyRent, ValidateSource.BODY), Rooms.modifyRent);
router.post(
	'/:roomId/checkout-costs',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.generateCheckoutCost, ValidateSource.BODY),
	Rooms.generateCheckoutCost,
);
router.get(
	'/:roomId/debts-receipts-unpaid',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.getDebtsAndReceiptUnpaid, ValidateSource.QUERY),
	Rooms.getDebtsAndReceiptUnpaid,
);
router.delete('/:roomId/debts', validator(schema.id, ValidateSource.PARAM), Rooms.deleteDebts);

router.get('/:roomId/fees-debts', validator(schema.id, ValidateSource.PARAM), Rooms.getRoomFeesAndDebts);

module.exports = router;
