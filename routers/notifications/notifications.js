const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const UseCase = require('../../data_providers/notifications');

exports.getNotifications = asyncHandler(async (req, res) => {
	const data = { ...req.user, ...req.query };
	console.log('log of getNotifications: ', data);
	const result = await UseCase.getNotifications(data);
	return new SuccessResponse('Success', result).send(res);
});

exports.getNotiSettings = asyncHandler(async (req, res) => {
	const data = req.user;
	console.log('log of getNotiSetting: ', data);
	const result = await UseCase.getNotiSettings(data.userId);
	return new SuccessResponse('Success', result).send(res);
});

exports.setSettingNotification = asyncHandler(async (req, res) => {
	const data = { ...req.user, ...req.body };
	console.log('log of setNotiSetting: ', data);
	const result = await UseCase.setSettingNotification(data.userId, data.type, data.enabled);
	return new SuccessMsgResponse('Success').send(res);
});
