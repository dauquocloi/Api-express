const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Notifications = require('./notifications');
const authentication = require('../../auth/authentication');

const router = express.Router();
router.use(authentication);
router.get('/', validator(schema.getAllNotis, ValidateSource.QUERY), Notifications.getNotifications);
router.get('/settings', Notifications.getNotiSettings);
router.patch('/settings', validator(schema.setNotiSetting, ValidateSource.BODY), Notifications.setSettingNotification);

module.exports = router;
