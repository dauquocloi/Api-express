const Entity = require('../models');
const { NotiForm } = require('../utils/NotiForm');
const Pipelines = require('./aggregates');
const getLastName = require('../utils/getLastName');
const { notificationTypes: notiTypes } = require('../constants/notifications');
const { Expo } = require('expo-server-sdk');
const { transfromBillStatus } = require('../constants/bills');

exports.getNotifications = async (receiverObjectId, pages, limit) => {
	const notifications = await Entity.NotisEntity.aggregate(Pipelines.notifications.getNotifications(receiverObjectId, pages, limit));
	return notifications;
};

// background job
exports.createTaskNotification = async ({ taskTitle, receiverIds, performersName, taskId }) => {
	const taskDoneDataFormat = {
		taskTitle,
		performersName: performersName?.map((performer) => getLastName(performer.fullName)).join(', '),
	};
	const createNotiForm = NotiForm('task', taskDoneDataFormat);
	const createNoti = await Entity.NotisEntity.create({
		type: notiTypes['TASK'],
		content: createNotiForm.content,
		title: createNotiForm.title,
		receivers: receiverIds,
		isRead: false,
		metaData: {
			taskId: taskId,
		},
	});
	if (!createNoti) return null;
	return createNoti.toObject();
};

exports.createTransactionNotification = async ({ roomIndex, buildingName, amount, billContent, paymentContent, billStatus, receiverIds }) => {
	const transactionDoneDataFormat = {
		roomIndex,
		buildingName,
		amount,
		billContent,
		paymentContent,
		billStatus,
	};
	const createNotiForm = NotiForm(notiTypes['TRANSACTION'], transactionDoneDataFormat);
	const createNoti = await Entity.NotisEntity.create({
		type: notiTypes['TRANSACTION'],
		content: createNotiForm.content,
		title: createNotiForm.title,
		receivers: receiverIds,
		isRead: false,
		metaData: {},
	});
	if (!createNoti) return null;
	return createNoti.toObject();
};

exports.createManagerCollectCashNotification = async ({
	receiverIds,
	roomIndex,
	buildingName,
	buildingId,
	billStatus,
	billType,
	billId,
	billContent,
	amount,
	collectorName,
}) => {
	const collectCashDataFormat = {
		roomIndex: roomIndex,
		buildingName: buildingName,
		billStatus: billStatus,
		billContent: billContent,
		amount: amount, // Số tiền nhân viên thu
		collector: collectorName,
	};

	const createNotiForm = NotiForm(notiTypes['COLLECT_CASH'], collectCashDataFormat);

	const createCollectCashNoti = await Entity.NotisEntity.create({
		type: notiTypes['COLLECT_CASH'],
		title: createNotiForm.title,
		content: createNotiForm.content,
		buildingId: buildingId,
		metaData: {
			billType: billType,
			billId: billId,
		},
		isRead: false,
		receivers: receiverIds,
	});

	if (!createCollectCashNoti) return null;
	return createCollectCashNoti.toObject();
};

exports.createPaymentNotification = async ({
	managementIds,
	amount,
	paymentContent,
	billContent,
	buildingName,
	roomIndex,
	billType,
	billStatus,
	billId,
}) => {
	const transfromStatus = transfromBillStatus[billStatus];
	const createNotiForm = NotiForm(notiTypes['TRANSACTION'], {
		amount,
		paymentContent,
		billContent,
		buildingName,
		roomIndex,
		billType,
		billStatus: transfromStatus,
	});

	const result = await Entity.NotisEntity.create({
		type: notiTypes['TRANSACTION'],
		title: createNotiForm.title,
		content: createNotiForm.content,
		receivers: managementIds,
		isRead: false,
		metaData: {
			billType: billType,
			billId: billId,
		},
	});

	return result.toObject();
};

exports.sendNotification = async (notiType, data) => {
	console.log('log of data from sendNotification: ', data);
	const { expoPushTokens = [], title, content, metaData } = data;
	const expo = new Expo();

	if (!Array.isArray(expoPushTokens) || expoPushTokens.length === 0) {
		throw new Error('Danh sách Push Token không hợp lệ hoặc trống');
	}

	// Lọc ra token hợp lệ
	const validTokens = expoPushTokens.filter((token) => Expo.isExpoPushToken(token));

	if (validTokens.length === 0) {
		throw new Error('Không có Push Token hợp lệ');
	}

	// Tạo danh sách thông báo
	const messages = validTokens.map((token) => ({
		to: token,
		sound: 'default',
		title,
		body: content,
		data: {
			type: notiType || 'notification',
			metaData: metaData || {},
		},
	}));

	try {
		const tickets = await expo.sendPushNotificationsAsync(messages);

		return {
			success: true,
			count: messages.length,
			tickets,
		};
	} catch (error) {
		console.error('Lỗi khi gửi thông báo:', error);
		return {
			success: false,
			error: error.message,
		};
	}
};
