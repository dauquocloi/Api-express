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

//==================//
router.use(authentication);
//==================//

router.get(
	'/:roomId',
	authorization(ROLES['OWNER'], ROLES['MANAGER'], ROLES['STAFF']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Rooms.getRoom,
);

router.post(
	'/:roomId/interiors',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.interiorBody, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Rooms.addInterior,
);

router.patch(
	'/:roomId/interiors/:interiorId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.paramsWithInterior, ValidateSource.PARAM),
	validator(schema.interiorBody, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Rooms.editInterior,
);

router.delete(
	'/:roomId/interiors/:interiorId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.paramsWithInterior, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Rooms.removeInterior,
);

// router.post('/:roomId/fees', Rooms.addFee);
// router.post(
// 	'/:roomId/workflows/deposit-and-first-invoice',
// 	validator(schema.id, ValidateSource.PARAM),
// 	validator(schema.generateReceiptInvoiceBody, ValidateSource.BODY),
// 	Rooms.generateDepositReceiptAndFirstInvoice,
// );

router.patch(
	'/:roomId/rent',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyRent, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Rooms.modifyRent,
);

router.post(
	'/:roomId/checkout-costs',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.generateCheckoutCost, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Rooms.generateCheckoutCost,
);

router.get(
	'/:roomId/debts-receipts-unpaid',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.getDebtsAndReceiptUnpaid, ValidateSource.QUERY),
	checkResourceAccess(RESOURCE),
	Rooms.getDebtsAndReceiptUnpaid,
);

router.delete(
	'/:roomId/debts',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Rooms.deleteDebts,
);

router.get(
	'/:roomId/fees-debts',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Rooms.getRoomFeesAndDebts,
);

router.get(
	'/:roomId/histories',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Rooms.getRoomHistories,
);

router.get(
	'/histories/:roomHistoryId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.getHistoryDetail, ValidateSource.PARAM),
	Rooms.getRoomHistoryDetail,
);

module.exports = router;
