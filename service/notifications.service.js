const Entity = require('../models');
const { NotiForm } = require('../utils/NotiForm');
const Pipelines = require('./aggregates');
const getLastName = require('../utils/getLastName');
const { notificationTypes: notiTypes } = require('../constants/notifications');
const { Expo } = require('expo-server-sdk');
const { transfromBillStatus } = require('../constants/bills');
const Roles = require('../constants/userRoles');
const dayjs = require('dayjs');
const formatCurrency = require('../utils/formatCurrency');

exports.getNotifications = async (receiverObjectId, pages, limit) => {
	const notifications = await Entity.NotisEntity.aggregate(Pipelines.notifications.getNotifications(receiverObjectId, pages, limit));
	return notifications;
};

exports.createTaskNotification = async ({ taskTitle, receiverIds, performersName, taskId }) => {
	const taskDoneDataFormat = {
		taskTitle,
		performersName: performersName,
	};
	const createNotiForm = NotiForm('task', taskDoneDataFormat);
	const createNoti = await Entity.NotisEntity.create({
		type: notiTypes['TASK_COMPLETED'],
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
	const formatAmount = formatCurrency(amount);
	const transactionDoneDataFormat = {
		roomIndex,
		buildingName,
		amount: formatAmount,
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
	const transformBillStatus = transfromBillStatus[billStatus];
	const formatAmount = formatCurrency(amount);
	const collectCashDataFormat = {
		roomIndex: roomIndex,
		buildingName: buildingName,
		billStatus: transformBillStatus,
		billContent: billContent,
		amount: formatAmount, // Số tiền nhân viên thu
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
	const formatAmount = formatCurrency(amount);
	const createNotiForm = NotiForm(notiTypes['TRANSACTION'], {
		amount: formatAmount,
		paymentContent,
		billContent,
		buildingName,
		roomIndex,
		billStatus: transfromStatus,
	});

	const url = `qltro://${billType === 'invoice' ? `invoice-detail` : `receipt-detail`}/${billId}`;
	const result = await Entity.NotisEntity.create({
		type: notiTypes['TRANSACTION'],
		title: createNotiForm.title,
		content: createNotiForm.content,
		receivers: managementIds,
		isRead: false,
		metaData: {
			billType: billType,
			billId: billId,
			url: url,
		},
	});

	return result.toObject();
};

exports.createContractExpiNotification = async ({ roomId, roomIndex, buildingName, contractEndDate, receiverIds }) => {
	const formattedDate = dayjs(contractEndDate).format('DD/MM/YYYY');
	const createNotiForm = NotiForm(notiTypes['CONTRACT_EXPIRE'], {
		roomIndex,
		buildingName,
		contractEndDate: formattedDate,
	});

	const result = await Entity.NotisEntity.create({
		type: notiTypes['TRANSACTION'],
		title: createNotiForm.title,
		content: createNotiForm.content,
		receivers: receiverIds,
		isRead: false,
		metaData: {
			roomId: roomId,
		},
	});

	return result.toObject();
};

exports.createTransactionDeclinedNotification = async ({
	roomIndex,
	billContent,
	billType,
	billId,
	transactionAmount,
	reason,
	buildingName,
	creatorName,
	receiverIds,
}) => {
	const formatTranscationAmount = formatCurrency(transactionAmount);
	const createNotiForm = NotiForm(notiTypes['TRANSACTION_DECLINED'], {
		roomIndex,
		billContent,
		reason,
		buildingName,
		creatorName,
		transactionAmount: formatTranscationAmount,
	});

	const result = await Entity.NotisEntity.create({
		type: notiTypes['TRANSACTION_DECLINED'],
		title: createNotiForm.title,
		content: createNotiForm.content,
		receivers: receiverIds,
		isRead: false,
		metaData: {
			billType: billType,
			billId: billId,
		},
	});

	return result.toObject();
};

exports.createNotificationRoomDeposited = async ({
	roomIndex,
	buildingName,
	rent,
	depositAmount,
	paidAmount,
	checkinDate,
	depositId,
	depositCompletionDate,
	receiverIds,
}) => {
	const formatCompletionDate = dayjs(depositCompletionDate).format('DD/MM/YYYY');
	const formatCheckinDate = dayjs(checkinDate).format('DD/MM/YYYY');
	const formatDepositAmount = formatCurrency(depositAmount);
	const formatPaidAmount = formatCurrency(paidAmount);
	const formatRent = formatCurrency(rent);

	const createNotiForm = NotiForm(notiTypes['ROOM_DEPOSITED'], {
		roomIndex,
		buildingName,
		rent: formatRent,
		depositAmount: formatDepositAmount,
		paidAmount: formatPaidAmount,
		checkinDate: formatCheckinDate,
		depositCompletionDate: formatCompletionDate,
	});

	const result = await Entity.NotisEntity.create({
		type: notiTypes['ROOM_DEPOSITED'],
		title: createNotiForm.title,
		content: createNotiForm.content,
		receivers: receiverIds,
		isRead: false,
		metaData: {
			depositId: depositId,
		},
	});

	return result.toObject();
};

exports.createNotificationDepositTerminated = async ({ roomIndex, buildingName, depositAmount, depositId, receiverIds }) => {
	const formatDepositAmount = formatCurrency(depositAmount);
	const createNotiForm = NotiForm(notiTypes['DEPOSIT_TERMINATED'], {
		roomIndex,
		buildingName,
		paidAmount: formatDepositAmount,
	});

	const result = await Entity.NotisEntity.create({
		type: notiTypes['DEPOSIT_TERMINATED'],
		title: createNotiForm.title,
		content: createNotiForm.content,
		receivers: receiverIds,
		isRead: false,
		metaData: {
			depositId: depositId,
		},
	});

	return result.toObject();
};

// should remove this function to utils.js
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

exports.createNotificationSetting = async (userId, session) => {
	const [result] = await Entity.NotiSettingsEntity.create(
		[
			{
				user: userId,
			},
		],
		{ session },
	);
	return result.toObject();
};
