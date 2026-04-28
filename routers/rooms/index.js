const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Rooms = require('./rooms');
const ROLES = require('../../constants/userRoles');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const { checkIdempotency } = require('../../middleware/idempotency');
const upload = require('../../middleware/multer');
const { RESOURCES, VALIDATE_SOURCE: RESOURCE_VS } = require('../../constants/resources');

const router = express.Router();

//==================//
router.use(authentication);
//==================//

router.get(
	'/:roomId',
	authorization(ROLES['OWNER'], ROLES['MANAGER'], ROLES['STAFF']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['rooms']),
	Rooms.getRoom,
);

router.post(
	'/:roomId/interiors',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.interiorBody, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['rooms']),
	Rooms.addInterior,
);

router.patch(
	'/:roomId/interiors/:interiorId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.paramsWithInterior, ValidateSource.PARAM),
	validator(schema.interiorBody, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['rooms']),
	checkIdempotency,
	Rooms.editInterior,
);

router.delete(
	'/:roomId/interiors/:interiorId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.paramsWithInterior, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['rooms']),
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
	checkResourceAccess(RESOURCES['rooms']),
	checkIdempotency,
	Rooms.modifyRent,
);

router.post(
	'/:roomId/checkout-costs',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.generateCheckoutCost, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['rooms']),
	checkIdempotency,
	Rooms.generateCheckoutCost,
);

router.get(
	'/:roomId/debts-receipts-unpaid',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	// validator(schema.getDebtsAndReceiptUnpaid, ValidateSource.QUERY),
	checkResourceAccess(RESOURCES['rooms']),
	Rooms.getDebtsAndReceiptUnpaid,
);

router.delete(
	'/:roomId/debts',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['rooms']),
	Rooms.deleteDebts,
);

router.get(
	'/:roomId/fees-debts',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['rooms']),
	Rooms.getRoomFeesAndDebts,
);

router.get(
	'/:roomId/histories',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['rooms']),
	Rooms.getRoomHistories,
);

router.get(
	'/histories/:roomHistoryId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.getHistoryDetail, ValidateSource.PARAM),
	Rooms.getRoomHistoryDetail,
);

router.post(
	'/:roomId/images',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	upload.array('images', 5),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['rooms']),
	checkIdempotency,
	Rooms.importImage,
);

router.patch(
	'/:roomId/note',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.writeNote, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['rooms']),
	checkIdempotency,
	Rooms.updateNoteRoom,
);

module.exports = router;
