// const { createNotification } = require('../data_providers/notifications');
// const { sendNotification } = require('../utils/notificationUtils');
// const Entity = require('../models');
// const mongoose = require('mongoose');
// const { getNotiForm } = require('../utils/getNotiForm');
// const { Connect } = require('../utils/MongoConnect');

// const { notificationQueue } = require('../queues');

// // Gọi hàm Connect và chỉ chạy server nếu kết nối thành công
// Connect('Qltro-test')
// 	.then(() => {
// 		console.log('✅ Đã kết nối MongoDB Atlas');
// 	})
// 	.catch((err) => {
// 		console.error('❌ Kết nối MongoDB thất bại:', err);
// 	});

// // Worker xử lý job
// notificationQueue.process(async (job) => {
// 	try {
// 		const { type, payload } = job.data;

// 		let receiverIds;
// 		let expoPushTokens;
// 		if (type == 'task') {
// 			const managementObjectIds = payload.managementIds.map((m) => mongoose.Types.ObjectId(m));
// 			const receiverInfo = await Entity.UsersEntity.find({ _id: { $in: managementObjectIds } }, { _id: 1, expoPushToken: 1 });
// 			if (!receiverInfo) throw new Error('Không tồn tại receiver');

// 			receiverIds = receiverInfo?.map((r) => r._id);
// 			expoPushTokens = receiverInfo?.map((r) => r.expoPushToken);
// 		} else {
// 			const buildingObjectId = mongoose.Types.ObjectId(payload.buildingId);
// 			const [receiverInfo] = await Entity.BuildingsEntity.aggregate([
// 				{
// 					$match: {
// 						_id: buildingObjectId,
// 					},
// 				},
// 				{
// 					$addFields: {
// 						owner: {
// 							$filter: {
// 								input: '$management',
// 								as: 'm',
// 								cond: {
// 									$eq: ['$$m.role', 'owner'],
// 								},
// 							},
// 						},
// 					},
// 				},
// 				{
// 					$lookup: {
// 						from: 'users',
// 						let: {
// 							ownerIds: {
// 								$map: {
// 									input: '$owner',
// 									as: 'o',
// 									in: '$$o.user',
// 								},
// 							},
// 						},
// 						pipeline: [
// 							{
// 								$match: {
// 									$expr: {
// 										$in: ['$_id', '$$ownerIds'],
// 									},
// 								},
// 							},
// 							{
// 								$project: {
// 									_id: 1,
// 									expoPushToken: 1,
// 								},
// 							},
// 						],
// 						as: 'users',
// 					},
// 				},
// 				{
// 					$project: {
// 						_id: 1,
// 						expoPushToken: {
// 							$map: {
// 								input: '$users',
// 								as: 'u',
// 								in: '$$u.expoPushToken',
// 							},
// 						},
// 						receiverIds: {
// 							$map: {
// 								input: '$users',
// 								as: 'u',
// 								in: '$$u._id',
// 							},
// 						},
// 					},
// 				},
// 			]);
// 			if (!receiverInfo) throw new Error('Lỗi không tìm thấy tòa nhà !');

// 			receiverIds = receiverInfo.receiverIds;
// 			expoPushTokens = receiverInfo.expoPushToken;
// 		}

// 		const createNoti = await createNotification(type, { ...payload, receiverIds });

// 		const result = await sendNotification(type, { ...createNoti, expoPushTokens });
// 		return result;
// 	} catch (error) {
// 		console.error('❌ Worker error:', error.message);
// 		throw error;
// 	}
// });

// console.log('🚀 Worker is running and listening for jobs...');
