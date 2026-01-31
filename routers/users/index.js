const schema = require('./schema');
const express = require('express');
const Users = require('./users');
const { validator } = require('../../utils/validator');
const { ValidateSource } = require('../../utils/validator');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');
const { checkIdempotency } = require('../../middleware/idempotency');

const router = express.Router();

//==================//
router.use(authentication);
//==================//

router.patch(
	'/:userId',
	authorization(ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.createManagement, ValidateSource.BODY),
	checkIdempotency,
	Users.modifyManagementInfo,
);

router.get('/managements', Users.getAllManagers);

router.post(
	'/managements',
	authorization(ROLES['OWNER']),
	validator(schema.createManagement, ValidateSource.BODY),
	checkIdempotency,
	Users.createManagement,
);

router.delete('/managements/:userId', validator(schema.id, ValidateSource.PARAM), Users.removeManager);

router.patch(
	'/managements/:userId/permissions',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.changeManagerPermission, ValidateSource.BODY),
	checkIdempotency,
	Users.modifyUserPermission,
);

router.get('/list-selection-managements', Users.getListSelectionManagements);

router.get('/managements/:userId/cash-collected', validator(schema.id, ValidateSource.PARAM), Users.checkManagerCollectedCash);

router.patch(
	'/managements/:userId/building-management',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.changeManagerBuildingManagement, ValidateSource.BODY),
	checkIdempotency,
	Users.changeUserBuildingManagement,
);

router.post('/devices', validator(schema.addDevice, ValidateSource.BODY), checkIdempotency, Users.addDevice);

module.exports = router;
