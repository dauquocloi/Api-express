const mongoose = require('mongoose');
var Entity = require('../models');
const { getNotiForm } = require('../utils/getNotiForm');

const getLastName = (fullName) => {
	if (!fullName || typeof fullName !== 'string') return '';
	return fullName.trim().split(' ').slice(-1).join(' ');
};

exports.createNotification = async (notiType, data) => {
	try {
		switch (notiType) {
			case 'collectCash': {
				// buildingName, roomIndex, receiptContent
				const receiverObjectIds = data.receiverIds.map((r) => mongoose.Types.ObjectId(r));

				let getNotiData;
				if (data.billType == 'receipt') {
					const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);
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
					const invoiceObjectId = mongoose.Types.ObjectId(data.invoiceId);
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
				const createNotiForm = getNotiForm('collectCash', collectCashDataFormat);

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
				const performerObjectIds = data.performerIds.map((p) => mongoose.Types.ObjectId(p));
				const receiverObjectIds = data.receiverIds.map((r) => mongoose.Types.ObjectId(r));

				const getPerformerName = await Entity.UsersEntity.find({ _id: { $in: performerObjectIds } }, { _id: 1, fullName: 1 });
				if (!getPerformerName) throw new Error('Lỗi user không tồn tại !');

				const taskDoneDataFormat = {
					taskTitle: data.title,
					performersName: getPerformerName?.map((performer) => getLastName(performer.fullName)).join(', '),
				};
				const createNotiForm = getNotiForm('task', taskDoneDataFormat);

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

exports.getNotifications = async (data, cb, next) => {
	try {
		const receiverObjectId = mongoose.Types.ObjectId(data.userId);
		const pages = parseInt(data.page) || 1;
		const limit = 10; // Ngày

		const listNoti = await Entity.NotisEntity.aggregate([
			{ $match: { receivers: receiverObjectId } },
			{ $sort: { createdAt: -1 } },
			{
				$addFields: {
					date: {
						$dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
					},
				},
			},
			{
				$group: {
					_id: '$date',
					notifications: { $push: '$$ROOT' },
				},
			},
			{ $sort: { _id: -1 } },
			{ $skip: (pages - 1) * limit },
			{ $limit: limit + 1 },
		]);

		const isListEnd = listNoti.length <= limit;

		cb(null, { notis: listNoti, isListEnd });
	} catch (error) {
		next(error);
	}
};
