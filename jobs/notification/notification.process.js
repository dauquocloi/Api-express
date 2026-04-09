const Services = require('../../service');
const getLastName = require('../../utils/getLastName');
const { notificationTypes: notiTypes } = require('../../constants/notifications');
const { Expo } = require('expo-server-sdk');
const ROLES = require('../../constants/userRoles');
const mongoose = require('mongoose');

const handleNotiTaskCompletedJob = async (payload) => {
	try {
		const { managementIds, taskTitle, performerIds, taskId } = payload;

		const receiverInfo = await Services.users.findUserByIds(managementIds).lean().exec();
		if (!receiverInfo) throw new Error('Không tìm thấy người nhận');
		const performers = await Services.users.findUserByIds(performerIds).select('fullName').lean().exec();
		const performersName = performers?.map((performer) => getLastName(performer.fullName)).join(', ');

		let receiverIds = receiverInfo?.map((r) => r._id);
		let expoPushTokens = receiverInfo?.map((r) => r.expoPushToken).filter((token) => Expo.isExpoPushToken(token));

		const createTaskNoti = await Services.notifications.createTaskNotification({ taskTitle, receiverIds, performersName, taskId });
		if (!createTaskNoti) throw new Error('Có lỗi trong quá trình tạo thông báo !');
		const notiSended = await Services.notifications.sendNotification(notiTypes['TASK'], {
			expoPushTokens: expoPushTokens,
			title: createTaskNoti.title,
			content: createTaskNoti.content,
			metaData: createTaskNoti.metaData,
		});
		if (!notiSended || notiSended.success === false) throw new Error('Gửi thông báo thất bại !');

		return notiSended;
	} catch (error) {
		throw error;
	}
};

const handleNotiManagerCollectCashInvoice = async (payload) => {
	try {
		const { collectorId, invoiceId, amount } = payload;
		const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);
		const data = await Services.invoices.getCashCollectorInfo(invoiceObjectId);
		if (!data) {
			throw new Error(`Invoice not found: ${invoiceId}`);
		}
		if (!data.receiver || (Array.isArray(data.receiver) && data.receiver.length === 0)) {
			throw new Error(`No receivers found for invoice: ${invoiceId}`);
		}

		const collectorInfo = await Services.users.findById(collectorId).populate('notificationSetting').lean().exec();
		if (!collectorInfo) {
			throw new Error(`Collector not found: ${collectorId}`);
		}

		// Lọc receivers có bật cashCollected notification
		const enabledReceivers = data.receiver?.notificationSetting?.cashCollected?.enabled ?? true;

		const createdNoti = await Services.notifications.createManagerCollectCashNotification({
			receiverIds: [data.receiver._id], // Gửi cho tất cả owner/manager
			roomIndex: data.room.roomIndex,
			buildingName: data.building.buildingName,
			buildingId: data.building._id,
			billStatus: data.status,
			billType: 'invoice',
			billId: data._id,
			billContent: data.invoiceContent,
			amount: amount,
			collectorName: getLastName(collectorInfo.fullName),
		});
		if (!createdNoti) {
			throw new Error('Failed to create notification in database');
		}

		console.log('log of createdNoti: ', createdNoti);

		if (!data.receiver.expoPushToken) {
			console.log('No push notifications sent - all users disabled or no valid tokens');
			return {
				success: true,
				created: true,
				pushSent: false,
				reason: 'All users have disabled push notifications or no valid tokens',
				notificationId: createdNoti._id,
				totalReceivers: 1,
				pushSentTo: 0,
			};
		}

		let notiSended;
		if (enabledReceivers) {
			notiSended = await Services.notifications.sendNotification(notiTypes['COLLECT_CASH'], {
				...createdNoti,
				expoPushTokens: [data.receiver.expoPushToken],
			});
		}

		return {
			success: true,
			created: true,
			pushSent: true,
			notificationId: createdNoti._id,
			totalReceivers: 1,
			pushSentTo: data.receiver._id,
			result: notiSended ?? null,
		};
	} catch (error) {
		console.error(`[NotiManagerCollectCashReceiptJob] Error:`, error);

		// Throw error để Bull đánh dấu job failed và retry
		throw error;
	}
};

module.exports = {
	handleNotiTaskCompletedJob,
	handleNotiManagerCollectCashInvoice,
};
