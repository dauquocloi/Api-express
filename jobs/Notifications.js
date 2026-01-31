const BaseJob = require('./BaseJob');
const mongoose = require('mongoose');
const Services = require('../service');
const { notificationTypes: notiTypes } = require('../constants/notifications');
const getLastName = require('../utils/getLastName');
const { Expo } = require('expo-server-sdk');
const ROLES = require('../constants/userRoles');
const Sentry = require('@sentry/node');

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
			const enabledReceivers = data.receiver?.notificationSetting?.cashCollected?.enabled ?? true;

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

			Sentry.captureException(error, {
				tags: {
					job: 'noti-manager-collect-cash',
					component: 'background-job',
				},
				extra: {
					payload: payload,
					errorMessage: error.message,
					errorStack: error.stack,
				},
			});

			// Throw error để Bull đánh dấu job failed và retry
			throw error;
		}
	}

	async onFailed(job, error) {
		console.error(`[Cash Collection Notification Failed] Job #${job.id}`, {
			error: error.message,
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			attemptsRemaining: job.opts.attempts - job.attemptsMade,
		});

		// Gửi alert lên Sentry với severity cao
		Sentry.captureException(error, {
			level: 'error',
			tags: {
				job: 'noti-manager-collect-cash',
				jobId: job.id,
				component: 'background-job',
				status: 'failed',
			},
			extra: {
				payload: job.data.payload,
				attemptsMade: job.attemptsMade,
				maxAttempts: job.opts.attempts,
				errorMessage: error.message,
				errorStack: error.stack,
			},
		});
	}
}

class NotiManagerCollectCashInvoiceJob extends BaseJob {
	constructor() {
		super('noti-manager-collect-cash-invoice');
	}

	async handle(payload) {
		try {
			const { collectorId, invoiceId, amount } = payload;
			const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);
			const data = await Services.invoices.getCashCollectorInfo(invoiceObjectId);
			console.log('log of data: ', data);
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

			Sentry.captureException(error, {
				tags: {
					job: 'noti-manager-collect-cash',
					component: 'background-job',
				},
				extra: {
					payload: payload,
					errorMessage: error.message,
					errorStack: error.stack,
				},
			});

			// Throw error để Bull đánh dấu job failed và retry
			throw error;
		}
	}

	async onFailed(job, error) {
		console.error(`[Cash Collection Notification Failed] Job #${job.id}`, {
			error: error.message,
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			attemptsRemaining: job.opts.attempts - job.attemptsMade,
		});

		// Gửi alert lên Sentry với severity cao
		Sentry.captureException(error, {
			level: 'error',
			tags: {
				job: 'noti-manager-collect-cash-invoice',
				jobId: job.id,
				component: 'background-job',
				status: 'failed',
			},
			extra: {
				payload: job.data.payload,
				attemptsMade: job.attemptsMade,
				maxAttempts: job.opts.attempts,
				errorMessage: error.message,
				errorStack: error.stack,
			},
		});
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

class NotiContractNearExpiJob extends BaseJob {
	constructor() {
		super('noti-contract-near-expi');
	}

	async handle(payload) {
		const { contractId, buildingId, roomIndex, roomId, contractEndDate } = payload;
		const data = await Services.buildings
			.findById(buildingId)
			.populate({ path: 'management.user', populate: 'notificationSetting' })
			.lean()
			.exec();
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
			.filter((m) => m.user?.notificationSetting?.contractExpiring?.enabled ?? true)
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

		const notiSended = await Services.notifications.sendNotification(notiTypes['CONTRACT_EXPIRING'], {
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
	}

	async onFailed(job, error) {
		console.error(`[Contract Expiring Notification Failed] Job #${job.id}`, {
			error: error.message,
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			attemptsRemaining: job.opts.attempts - job.attemptsMade,
		});

		// Gửi alert lên Sentry với severity cao
		Sentry.captureException(error, {
			level: 'error',
			tags: {
				job: 'noti-contract-near-expi',
				jobId: job.id,
				component: 'background-job',
				status: 'failed',
			},
			extra: {
				payload: job.data.payload,
				attemptsMade: job.attemptsMade,
				maxAttempts: job.opts.attempts,
				errorMessage: error.message,
				errorStack: error.stack,
			},
		});
	}
}

class NotiTransactionDeclinedJob extends BaseJob {
	constructor() {
		super('noti-transaction-declined');
	}

	async handle(payload) {
		const { id, billType, transactionAmount, reason = '', receiverId } = payload;
		const receiverInfo = await Services.users.findById(receiverId).lean().exec();
		if (!receiverInfo) throw new Error('Receiver not found');

		let billContent;
		let roomIndex;
		let buildingName;
		let billId;

		if (billType === 'invoice') {
			const invoiceInfo = await Services.invoices.findById(id).populate({ path: 'room', populate: 'building' }).lean().exec();
			if (!invoiceInfo) throw new Error('Invoice not found');
			const { room, invoiceContent } = invoiceInfo;
			roomIndex = room.roomIndex;
			buildingName = room.building.buildingName;
			billContent = invoiceContent;
			billId = invoiceInfo._id;
		} else if (billType === 'receipt') {
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
	}
}

module.exports = {
	NotiTaskCompletedJob,
	NotiManagerCollectCashReceiptJob,
	NotiPaymentJob,
	NotiManagerCollectCashInvoiceJob,
	NotiContractNearExpiJob,
	NotiTransactionDeclinedJob,
};
