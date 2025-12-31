const BaseJob = require('./BaseJob');
const mongoose = require('mongoose');
const Services = require('../service');
const { notificationTypes: notiTypes } = require('../constants/notifications');
const getLastName = require('../utils/getLastName');
const { Expo } = require('expo-server-sdk');
const ROLES = require('../constants/userRoles');

class NotiTaskCompletedJob extends BaseJob {
	constructor() {
		super('noti-task-completed');
	}

	// *Job handler
	async handle(payload) {
		const { managementIds, taskTitle, performerIds, taskId } = payload;

		const receiverInfo = await Services.users.findUserByIds(managementIds).lean().exec();
		if (!receiverInfo) throw new Error('Không tìm thấy người nhận');
		const performers = await Services.users.findUserByIds(performerIds).select('fullName').lean().exec();
		const performerNames = performers?.map((performer) => getLastName(performer.fullName));

		let receiverIds = receiverInfo?.map((r) => r._id);
		let expoPushTokens = receiverInfo?.map((r) => r.expoPushToken).filter((token) => Expo.isExpoPushToken(token));

		const createTaskNoti = await Services.notifications.createTaskNotification({ taskTitle, receiverIds, performerNames, taskId });
		if (!createTaskNoti) throw new Error('Có lỗi trong quá trình tạo thông báo !');
		const notiSended = await Services.notifications.sendNotification(notiTypes['TASK'], {
			expoPushTokens: expoPushTokens,
			title: createTaskNoti.title,
			content: createTaskNoti.content,
			metaData: createTaskNoti.metaData,
		});
		if (!notiSended || notiSended.success === false) throw new Error('Gửi thông báo thất bại !');

		return notiSended;
	}

	async onCompleted(job, result) {
		const { amount } = job.data.payload;

		// Update order status
		console.log('JOB COMPLETED', result);
	}

	async onFailed(job, error) {
		const { amount } = job.data.payload;

		// Update order as payment failed
		console.log('JOB FAILED', error);
	}
}

class NotiManagerCollectCashReceiptJob extends BaseJob {
	constructor() {
		super('noti-manager-collect-cash');
	}

	async handle(payload) {
		const { collectorId, receiptId, amount } = payload;
		const receiptObjectId = new mongoose.Types.ObjectId(receiptId);
		const data = await Services.receipts.getNotiReceivedInfoByReceiptId(receiptObjectId);
		const collectorInfo = await Services.users.findById(collectorId).lean().exec();
		console.log('log of data: ', data);

		const createdNoti = await Services.notifications.createManagerCollectCashNotification({
			receiverIds: [data.receiver._id],
			roomIndex: data.room.roomIndex,
			buildingName: data.building.buildingName,
			buildingId: data.building._id,
			billStatus: data.status,
			billType: 'receipt',
			billId: data._id,
			billContent: data.receiptContent,
			amount: amount,
			collectorName: getLastName(collectorInfo.fullName),
		});
		console.log('log of createdNoti: ', createdNoti);

		const expoPushTokens = [data.receiver.expoPushToken];
		const notiSended = await Services.notifications.sendNotification(notiTypes['COLLECT_CASH'], {
			...createdNoti,
			expoPushTokens,
		});
		return notiSended;
	}
}

class NotiPaymentJob extends BaseJob {
	constructor() {
		super('noti-payment');
	}

	async handle(payload) {
		const { managementIds, amount, paymentContent, billContent, buildingName, roomIndex, billType, billStatus, billId } = payload;

		const notiCreated = await Services.notifications.createPaymentNotification({
			managementIds,
			amount,
			paymentContent,
			billContent,
			buildingName,
			roomIndex,
			billType,
			billStatus,
			billId,
		});
		console.log('log of notiCreated: ', notiCreated);

		const managementsInfo = await Services.users.findUserByIds(managementIds).lean().exec();
		const expoPushTokens = managementsInfo?.map((r) => r.expoPushToken).filter((token) => Expo.isExpoPushToken(token));
		const notiSended = await Services.notifications.sendNotification(notiTypes['TRANSACTION'], {
			title: notiCreated.title,
			content: notiCreated.content,
			metaData: notiCreated.metaData,
			expoPushTokens,
		});

		return notiSended;
	}
}

module.exports = { NotiTaskCompletedJob, NotiManagerCollectCashReceiptJob, NotiPaymentJob };
