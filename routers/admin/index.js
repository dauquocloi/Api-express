const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const Admins = require('./admins');
const ROLES = require('../../constants/userRoles');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const upload = require('../../middleware/multer');
const router = express.Router();
const schema = require('./schema');

// router.use(authentication);
// router.use(authorization(ROLES['ADMIN']));

router.post(
	'/import-building',
	upload.fields([
		{ name: 'contractPdfUrl', maxCount: 1 },
		{ name: 'contractDocxUrl', maxCount: 1 },
		{ name: 'depositTermUrl', maxCount: 1 },
	]),
	Admins.importBuilding,
);

router.post('/import-rooms', upload.single('roomFile'), Admins.importRooms);

router.post('/import-first-statistic', Admins.importFirstStatistic);

router.get('/banks', Admins.getAllBanks);

router.get('/users/detail', validator(schema.getUserDetail, ValidateSource.QUERY), Admins.getUserDetail);

router.patch(
	'/buildings/:buildingId/payment-info',
	validator(schema.buildingId, ValidateSource.PARAM),
	validator(schema.importPaymentInfo, ValidateSource.BODY),
	Admins.importPaymentInfo,
);

router.post('/bank-accounts', validator(schema.createBankAccount, ValidateSource.BODY), Admins.createBankAccount);
router.get('/buildings', validator(schema.userId, ValidateSource.QUERY), Admins.getBuildingsByUserId);

module.exports = router;
