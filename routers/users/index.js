const schema = require('./schema');
const express = require('express');
const Users = require('./users');
const router = express.Router();
const { validator } = require('../../utils/validator');
const { ValidateSource } = require('../../utils/validator');
const authentication = require('../../auth/authentication');
// router.get('/', Users.getAll);
router.use(authentication);
router.patch('/:userId', Users.modifyUserInfo);
router.get('/managements', Users.getAllManagers);
// router.post('/managements', Users.createManager);
router.delete('/managements/:userId', validator(schema.id, ValidateSource.PARAM), Users.removeManager);
router.patch(
	'/managements/:userId/permissions',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.changeManagerPermission, ValidateSource.BODY),
	Users.modifyUserPermission,
);
router.get('/list-selection-managements', Users.getListSelectionManagements);
router.get('/managements/:userId/cash-collected', validator(schema.id, ValidateSource.PARAM), Users.checkManagerCollectedCash);
router.patch(
	'/managements/:userId/building-management',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.changeManagerBuildingManagement, ValidateSource.BODY),
	Users.changeUserBuildingManagement,
);

module.exports = router;
