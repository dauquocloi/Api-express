const mongoose = require('mongoose');
const Entity = require('../models');
const { NotiForm } = require('../utils/NotiForm');
const Services = require('../service');
const { NotFoundError } = require('../AppError');

const getLastName = (fullName) => {
	if (!fullName || typeof fullName !== 'string') return '';
	return fullName.trim().split(' ').slice(-1).join(' ');
};

//piece of shit
exports.createNotification = async (notiType, data) => {
	try {
		switch (notiType) {
			case 'collectCash': {
				// buildingName, roomIndex, receiptContent
				const receiverObjectIds = data.receiverIds.map((r) => new mongoose.Types.ObjectId(r));

				let getNotiData;
				if (data.billType == 'receipt') {
					const receiptObjectId = new mongoose.Types.ObjectId(data.receiptId);
					[getNotiData] = await Entity.ReceiptsEntity.aggregate([
						{
							$match: {
								_id: receiptObjectId,
							},
						},
						{
							$lookup: {
								from: 'rooms',
								localField: 'room',
								foreignField: '_id',
								as: 'roomInfo',
							},
						},
						{
							$unwind: '$roomInfo',
						},
						{
							$lookup: {
								from: 'buildings',
								localField: 'roomInfo.building',
								foreignField: '_id',
								as: 'buildingInfo',
							},
						},
						{
							$unwind: '$buildingInfo',
						},
						{
							$project: {
								_id: 1,
								billContent: '$receiptContent',
								roomIndex: '$roomInfo.roomIndex',
								buildingName: '$buildingInfo.buildingName',
								buildingId: '$buildingInfo._id',
								billStatus: '$status',
							},
						},
					]);
				} else if (data.billType == 'invoice') {
					const invoiceObjectId = new mongoose.Types.ObjectId(data.invoiceId);
					[getNotiData] = await Entity.InvoicesEntity.aggregate([
						{
							$match: {
								_id: invoiceObjectId,
							},
						},
						{
							$lookup: {
								from: 'rooms',
								localField: 'room',
								foreignField: '_id',
								as: 'roomInfo',
							},
						},
						{
							$unwind: '$roomInfo',
						},
						{
							$lookup: {
								from: 'buildings',
								localField: 'roomInfo.building',
								foreignField: '_id',
								as: 'buildingInfo',
							},
						},
						{
							$unwind: '$buildingInfo',
						},
						{
							$project: {
								_id: 1,
								billContent: '$invoiceContent',
								roomIndex: '$roomInfo.roomIndex',
								buildingName: '$buildingInfo.buildingName',
								billStatus: '$status',
							},
						},
					]);
				}

				if (!getNotiData || Object.keys(getNotiData).length === 0) throw new Error('Hóa đơn không tồn tại hoặc dữ liệu rỗng');

				const collectCashDataFormat = {
					roomIndex: getNotiData.roomIndex,
					buildingName: getNotiData.buildingName,
					billStatus: getNotiData.billStatus,
					billContent: getNotiData.billContent,
					amount: data.amount, // Số tiền nhân viên thu
					collector: data.collectorName,
				};
				const createNotiForm = NotiForm('collectCash', collectCashDataFormat);

				const createCollectCashNoti = await Entity.NotisEntity.create({
					type: 'collectCash',
					title: createNotiForm.title,
					content: createNotiForm.content,
					buildingId: getNotiData.buildingId,
					metaData: {
						billType: data.billType,
						billId: getNotiData._id,
					},
					isRead: false,
					receivers: receiverObjectIds,
				});

				const notiObject = createCollectCashNoti.toObject();
				return notiObject;
			}

			case 'task': {
				const performerObjectIds = data.performerIds.map((p) => new mongoose.Types.ObjectId(p));
				const receiverObjectIds = data.receiverIds.map((r) => new mongoose.Types.ObjectId(r));

				const getPerformerName = await Entity.UsersEntity.find({ _id: { $in: performerObjectIds } }, { _id: 1, fullName: 1 });
				if (!getPerformerName) throw new Error('Lỗi user không tồn tại !');

				const taskDoneDataFormat = {
					taskTitle: data.title,
					performersName: getPerformerName?.map((performer) => getLastName(performer.fullName)).join(', '),
				};
				const createNotiForm = NotiForm('task', taskDoneDataFormat);

				const createNoti = await Entity.NotisEntity.create({
					type: 'task',
					content: createNotiForm.content,
					title: createNotiForm.title,
					receivers: receiverObjectIds,
					isRead: false,
					metaData: {
						taskId: data.taskId,
					},
				});
				const notiObject = createNoti.toObject();
				return notiObject;
			}

			default:
				throw new Error(`Loại thông báo "${notiType}" chưa được hỗ trợ.`);
		}
	} catch (error) {
		console.log('log of error from notifications: ', error);
		throw error;
	}
};

exports.getNotifications = async (receiverId, page) => {
	const receiverObjectId = new mongoose.Types.ObjectId(receiverId);
	const pages = page || 1;
	const limit = 10; // Ngày

	const listNoti = await Services.notifications.getNotifications(receiverObjectId, pages, limit);
	const isListEnd = listNoti.length <= limit;

	return { notis: listNoti, isListEnd };
};

exports.getNotiSettings = async (userId) => {
	let responseData = {};
	const notiSettings = await Entity.NotiSettingsEntity.findOne({ user: userId }, { _id: 0, user: 0 });
	if (!notiSettings) throw new NotFoundError('Không tìm thấy tài khoản!');
	responseData.notiSettings = notiSettings;

	if (data.role === 'owner') {
		const buildingSettings = await Entity.BuildingsEntity.find({ 'management.user': userId }, { settings: 1 });
		if (!buildingSettings || buildingSettings.length === 0) throw new NotFoundError('Tòa nhà không tồn tại trong hệ thống');
		responseData.buildingSettings = buildingSettings.map((b) => b.settings);
	}

	return responseData;
};

exports.setSettingNotification = async (userId, type, enabled) => {
	const notiSettings = await Entity.NotiSettingsEntity.findOneAndUpdate({ user: userId }, { $set: { [type]: enabled } });
	if (!notiSettings) throw new NotFoundError('Không tìm thấy tài khoản!');
	return 'Success';
};
