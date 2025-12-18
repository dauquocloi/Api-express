const schema = require('./schema');
const express = require('express');
const Users = require('./users');
const router = express.Router();
const { validator } = require('../../utils/validator');
const { ValidateSource } = require('../../utils/validator');
const authentication = require('../../auth/authentication');
// router.get('/', Users.getAll);
// router.use(authentication);
router.patch('/:userId', Users.modifyUserInfo);
router.get('/managements', Users.getAllManagers);
// router.post('/managements', Users.createManager);
router.patch('/managements/:userId', Users.removeManager);
router.patch('/:userId/permissions', validator(schema.id, ValidateSource.PARAM), Users.modifyUserPermission);
router.get('/list-selection-managements', Users.getListSelectionManagements);
router.get('/:userId/managements-cash-collected', validator(schema.id, ValidateSource.PARAM), Users.checkManagerCollectedCash);
router.patch('/:userId/building-management', Users.changeUserBuildingManagement);

module.exports = router;
