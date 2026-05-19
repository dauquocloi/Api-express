const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const Admins = require('./admins');
const Users = require('./users');
const Companies = require('./companies');
const ROLES = require('../../constants/userRoles');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const upload = require('../../middleware/multer');
const router = express.Router();
const schema = require('./schema');
const { checkIdempotency } = require('../../middleware/idempotency');

// router.use(authentication);
// router.use(authorization(ROLES['ADMIN']));

router.post(
	'/import-building',
	upload.fields([
		{ name: 'contractPdfUrl', maxCount: 1 },
		{ name: 'contractDocxUrl', maxCount: 1 },
		{ name: 'depositTermUrl', maxCount: 1 },
	]),
	validator(schema.importBuilding, ValidateSource.BODY),
	checkIdempotency,
	Admins.importBuilding,
);

router.post('/import-rooms', upload.single('roomFile'), checkIdempotency, Admins.importRooms);

router.post('/import-first-statistic', Admins.importFirstStatistic);

router.get('/banks', Admins.getAllBanks);

router.get('/users/info', validator(schema.getUserDetail, ValidateSource.QUERY), Users.getUserDetail);

router.patch(
	'/buildings/:buildingId/payment-info',
	validator(schema.buildingId, ValidateSource.PARAM),
	validator(schema.importPaymentInfo, ValidateSource.BODY),
	Admins.importPaymentInfo,
);

router.post('/bank-accounts', validator(schema.createBankAccount, ValidateSource.BODY), checkIdempotency, Admins.createBankAccount);

router.get('/buildings', validator(schema.userId, ValidateSource.QUERY), Admins.getBuildingsByUserId);

router.post('/users', validator(schema.createUser, ValidateSource.BODY), checkIdempotency, Users.createUser);

router.post('/companies', validator(schema.createCompany, ValidateSource.BODY), checkIdempotency, Companies.createCompany);

module.exports = router;
