const Entity = require('../models');
const Pipelines = require('./aggregates');

exports.getNotifications = async (receiverObjectId, pages, limit) => {
	const notifications = await Entity.NotisEntity.aggregate(Pipelines.notifications.getNotifications(receiverObjectId, pages, limit));
	return notifications;
};
