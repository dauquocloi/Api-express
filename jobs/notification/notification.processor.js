const Services = require('../../service');
const getLastName = require('../../utils/getLastName');
const { notificationTypes: notiTypes, ownerNotiSettings, managerNotiSettings } = require('../../constants/notifications');
const { Expo } = require('expo-server-sdk');
const ROLES = require('../../constants/userRoles');
const { billType: BILL_TYPE } = require('../../constants/bills');
const mongoose = require('mongoose');

const handleNotiTaskCompletedJob = async (payload) => {
	try {
		// throw new Error('Error for testing');
		const { managementIds, taskTitle, performerIds, taskId } = payload;

		const receiverInfo = await Services.users.findUserByIds(managementIds).lean().exec();
		if (!receiverInfo || receiverInfo.length === 0) throw new Error('Không tìm thấy người nhận');
		const performers = await Services.users.findUserByIds(performerIds).select('fullName').lean().exec();
		const performersName = performers?.map((performer) => getLastName(performer.fullName)).join(', ');

		let receiverIds = receiverInfo.map((r) => r._id);
		const expoPushTokens = receiverInfo.filter((r) => r.notificationSetting?.[notiTypes['TASK_COMPLETED']] !== false).map((r) => r.expoPushToken);

		const createTaskNoti = await Services.notifications.createTaskNotification({ taskTitle, receiverIds, performersName, taskId });
		if (!createTaskNoti) throw new Error('Có lỗi trong quá trình tạo thông báo !');
		const notiSended = await Services.notifications.sendNotification(notiTypes['TASK_COMPLETED'], {
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

		const collectorInfo = await Services.users.findById(collectorId).lean().exec();
		if (!collectorInfo) {
			throw new Error(`Collector not found: ${collectorId}`);
		}

		// Lọc receivers có bật cashCollected notification
		const enabledReceivers = data.receiver?.notificationSetting?.[notiTypes['COLLECT_CASH']] ?? true;

		const createdNoti = await Services.notifications.createManagerCollectCashNotification({
			receiverIds: [data.receiver._id],
			roomIndex: data.room.roomIndex,
			buildingName: data.building.buildingName,
			buildingId: data.building._id,
			billStatus: data.status,
			billType: BILL_TYPE['INVOICE'],
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

const handleNotiManagerCollectCashReceipt = async (payload) => {
	try {
		const { collectorId, receiptId, amount } = payload;
		const receiptObjectId = new mongoose.Types.ObjectId(receiptId);
		const data = await Services.receipts.getNotiReceivedInfoByReceiptId(receiptObjectId);
		if (!data) {
			throw new Error(`Receipt not found: ${receiptId}`);
		}
		if (!data.receiver) {
			throw new Error(`No receivers found for receipt: ${receiptId}`);
		}
		const collectorInfo = await Services.users.findById(collectorId).populate('notificationSetting').lean().exec();
		if (!collectorInfo) {
			throw new Error(`Collector not found: ${collectorId}`);
		}
		if (collectorInfo.role === ROLES.OWNER) {
			return {
				success: true,
				created: false,
				pushSent: false,
			};
		}

		// Lọc receivers có bật cashCollected notification
		const enabledReceivers = data.receiver?.notificationSetting?.[notiTypes['COLLECT_CASH']] ?? true;

		const createdNoti = await Services.notifications.createManagerCollectCashNotification({
			receiverIds: [data.receiver._id],
			roomIndex: data.room.roomIndex,
			buildingName: data.building.buildingName,
			buildingId: data.building._id,
			billStatus: data.status,
			billType: BILL_TYPE['RECEIPT'],
			billId: data._id,
			billContent: data.receiptContent,
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

const handleNotiPayment = async (payload) => {
	try {
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
		const expoPushTokens = managementsInfo
			?.filter((r) => r.notificationSetting?.[notiTypes['TRANSACTION']] !== false)
			.map((r) => r.expoPushToken);

		const notiSended = await Services.notifications.sendNotification(notiTypes['TRANSACTION'], {
			title: notiCreated.title,
			content: notiCreated.content,
			metaData: notiCreated.metaData,
			expoPushTokens,
		});

		return notiSended;
	} catch (error) {
		throw error;
	}
};

const handleNotiContractNearExpired = async (payload) => {
	try {
		const { contractId, buildingId, roomIndex, roomId, contractEndDate } = payload;
		const data = await Services.buildings.findById(buildingId).populate({ path: 'management.user' }).lean().exec();
		console.log('log of data from NotiContractNearExpiJob: ', data);

		if (!data || !data.management) {
			throw new Error('Building not found');
		}

		const receivers = data.management.filter((m) => m.user && (m.role.includes(ROLES['MANAGER']) || m.role.includes(ROLES['OWNER'])));
		const notiCreated = await Services.notifications.createContractExpiNotification({
			roomId: roomId,
			roomIndex: roomIndex,
			buildingName: data.buildingName,
			contractEndDate: contractEndDate,
			receiverIds: receivers.map((m) => m.user._id),
		});
		if (!notiCreated) throw new Error('Create Notification Failed');

		const userEnabledNoti = receivers
			.filter((m) => m.user?.notificationSetting?.[notiTypes['CONTRACT_EXPIRE']] !== false)
			.map((m) => m.user?.expoPushToken)
			.filter((token) => Expo.isExpoPushToken(token));

		if (userEnabledNoti.length === 0) {
			console.log('No push notifications sent - all users disabled or no valid tokens');
			return {
				success: true,
				created: true,
				pushSent: false,
				reason: 'All users have disabled push notifications or no valid tokens',
				notificationId: notiCreated._id,
				totalReceivers: receivers.length,
				pushSentTo: 0,
			};
		}

		const notiSended = await Services.notifications.sendNotification(notiTypes['CONTRACT_EXPIRE'], {
			...notiCreated,
			expoPushTokens: userEnabledNoti,
		});

		return {
			success: true,
			created: true,
			pushSent: true,
			notificationId: notiCreated._id,
			totalReceivers: receivers.length,
			pushSentTo: userEnabledNoti,
			result: notiSended ?? null,
		};
	} catch (error) {
		throw error;
	}
};

const handleNotiTransactionDeclined = async (payload) => {
	try {
		const { id, billType, transactionAmount, reason = '', receiverId } = payload;
		const receiverInfo = await Services.users.findById(receiverId).lean().exec();
		if (!receiverInfo) throw new Error('Receiver not found');

		let billContent;
		let roomIndex;
		let buildingName;
		let billId;

		if (billType === BILL_TYPE['INVOICE']) {
			const invoiceInfo = await Services.invoices.findById(id).populate({ path: 'room', populate: 'building' }).lean().exec();
			if (!invoiceInfo) throw new Error('Invoice not found');
			const { room, invoiceContent } = invoiceInfo;
			roomIndex = room.roomIndex;
			buildingName = room.building.buildingName;
			billContent = invoiceContent;
			billId = invoiceInfo._id;
		} else if (billType === BILL_TYPE['RECEIPT']) {
			const receiptInfo = await Services.receipts.findById(id).populate({ path: 'room', populate: 'building' }).lean().exec();
			console.log('log of receiptInfo: ', receiptInfo);
			if (!receiptInfo) throw new Error('Receipt not found');
			const { room, receiptContent } = receiptInfo;
			roomIndex = room.roomIndex;
			buildingName = room.building.buildingName;
			billContent = receiptContent;
			billId = receiptInfo._id;
		}

		const notiCreated = await Services.notifications.createTransactionDeclinedNotification({
			roomIndex: roomIndex,
			billContent: billContent,
			billType,
			billId: billId,
			transactionAmount,
			reason,
			buildingName: buildingName,
			creatorName: receiverInfo.fullName,
			receiverIds: [receiverInfo._id.toString()],
		});

		if (receiverInfo.expoPushToken) {
			const notiSended = await Services.notifications.sendNotification(notiTypes['TRANSACTION_DECLINED'], {
				...notiCreated,
				expoPushTokens: [receiverInfo.expoPushToken],
			});

			return {
				success: true,
				created: true,
				pushSent: true,
				notificationId: notiCreated._id,
				totalReceivers: 1,
				pushSentTo: [receiverInfo.expoPushToken],
				result: notiSended ?? null,
			};
		} else {
			return {
				success: true,
				created: true,
				pushSent: false,
				reason: 'Collector does not have push notification token',
				notificationId: notiCreated._id,
				totalReceivers: 0,
				pushSentTo: 0,
				result: null,
			};
		}
	} catch (error) {
		throw error;
	}
};

const handleNotiRoomDeposited = async (payload) => {
	try {
		const { depositId } = payload;
		const depositInfo = await Services.deposits
			.findById(depositId)
			.populate({
				path: 'room',
				select: 'roomIndex',
			})
			.populate({
				path: 'building',
				select: 'buildingName',
				populate: {
					path: 'management.user',
				},
			})
			.lean()
			.exec();
		if (!depositInfo) throw new Error('Deposit not found');

		const { management } = depositInfo.building;
		console.log('log of management: ', management);

		const receivers = management.filter((m) => [ROLES['MANAGER'], ROLES['OWNER']].includes(m.user.role));
		console.log('log of receivers: ', receivers);
		const receiverIds = receivers.map((m) => m.user._id.toString());

		const userEnabledNoti = receivers
			.filter((m) => m.user?.notificationSetting?.[notiTypes['ROOM_DEPOSITED']] !== false)
			.map((m) => m.user?.expoPushToken);

		console.log('log of userEnabledNoti: ', userEnabledNoti);

		const notiCreated = await Services.notifications.createNotificationRoomDeposited({
			depositId,
			roomIndex: depositInfo.room.roomIndex,
			buildingName: depositInfo.building.buildingName,
			rent: depositInfo.rent,
			depositAmount: depositInfo.depositAmount,
			paidAmount: depositInfo.actualDepositAmount,
			checkinDate: depositInfo.checkinDate,
			receiverIds: receiverIds,
			depositCompletionDate: depositInfo.depositCompletionDate,
		});

		const notiSended = await Services.notifications.sendNotification(notiTypes['ROOM_DEPOSITED'], {
			...notiCreated,
			expoPushTokens: userEnabledNoti,
		});

		return {
			success: true,
			created: true,
			pushSent: true,
			notificationId: notiCreated._id,
			totalReceivers: receivers.length,
			pushSentTo: userEnabledNoti,
			result: notiSended ?? null,
		};
	} catch (error) {
		console.error(error);
		throw error;
	}
};

const handleNotiDepositTerminated = async (payload) => {
	try {
		const { depositId } = payload;
		const depositInfo = await Services.deposits
			.findById(depositId)
			.populate({
				path: 'room',
				select: 'roomIndex',
			})
			.populate({
				path: 'building',
				select: 'buildingName',
				populate: {
					path: 'management.user',
					populate: 'notificationSetting',
				},
			})
			.lean()
			.exec();
		if (!depositInfo) throw new Error('Deposit not found');

		const { management } = depositInfo.building;
		console.log('log of management: ', management);
		const receivers = management.filter((m) => [ROLES['MANAGER'], ROLES['OWNER']].includes(m.user.role));
		const receiverIds = receivers.map((m) => m.user._id.toString());

		const userEnabledNoti = receivers.map((m) => m.user?.expoPushToken).filter((token) => Expo.isExpoPushToken(token));

		const notiCreated = await Services.notifications.createNotificationDepositTerminated({
			roomIndex: depositInfo.room.roomIndex,
			buildingName: depositInfo.building.buildingName,
			depositAmount: depositInfo.depositAmount,
			depositId: depositId,
			receiverIds: receiverIds,
		});

		const notiSended = await Services.notifications.sendNotification(notiTypes['DEPOSIT_TERMINATED'], {
			...notiCreated,
			expoPushTokens: userEnabledNoti,
		});

		return {
			success: true,
			created: true,
			pushSent: true,
			notificationId: notiCreated._id,
			totalReceivers: receivers.length,
			pushSentTo: userEnabledNoti,
			result: notiSended ?? null,
		};
	} catch (error) {
		console.error(error);
		throw error;
	}
};

module.exports = {
	handleNotiTaskCompletedJob,
	handleNotiManagerCollectCashInvoice,
	handleNotiManagerCollectCashReceipt,
	handleNotiPayment,
	handleNotiContractNearExpired,
	handleNotiTransactionDeclined,
	handleNotiRoomDeposited,
	handleNotiDepositTerminated,
};
