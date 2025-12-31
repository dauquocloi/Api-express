const { createNotification } = require('../data_providers/notifications');
const { sendNotification } = require('../utils/notificationUtils');
const Entity = require('../models');
const mongoose = require('mongoose');
const { NotiForm } = require('../utils/NotiForm');
const { Connect } = require('../utils/MongoConnect');
const generateContract = require('../utils/generateContract');
const moment = require('moment');
const { notificationQueue, generateContractQueue, modifyContractQueue } = require('../queues');
const randomFileName = require('../utils/randomFileName');

Connect('Qltro-test')
	.then(() => {
		console.log('✅ Đã kết nối MongoDB Atlas');
	})
	.catch((err) => {
		console.error('❌ Kết nối MongoDB thất bại:', err);
	});

// Worker notification
notificationQueue.process(async (job) => {
	try {
		const { type, payload } = job.data;

		let receiverIds;
		let expoPushTokens;
		if (type == 'task') {
			const managementObjectIds = payload.managementIds.map((m) => new mongoose.Types.ObjectId(m));
			const receiverInfo = await Entity.UsersEntity.find({ _id: { $in: managementObjectIds } }, { _id: 1, expoPushToken: 1 });
			if (!receiverInfo) throw new Error('Không tồn tại receiver');

			receiverIds = receiverInfo?.map((r) => r._id);
			expoPushTokens = receiverInfo?.map((r) => r.expoPushToken);
		} else {
			const buildingObjectId = new mongoose.Types.ObjectId(payload.buildingId);
			const [receiverInfo] = await Entity.BuildingsEntity.aggregate([
				{
					$match: {
						_id: buildingObjectId,
					},
				},
				{
					$addFields: {
						owner: {
							$filter: {
								input: '$management',
								as: 'm',
								cond: {
									$eq: ['$$m.role', 'owner'],
								},
							},
						},
					},
				},
				{
					$lookup: {
						from: 'users',
						let: {
							ownerIds: {
								$map: {
									input: '$owner',
									as: 'o',
									in: '$$o.user',
								},
							},
						},
						pipeline: [
							{
								$match: {
									$expr: {
										$in: ['$_id', '$$ownerIds'],
									},
								},
							},
							{
								$project: {
									_id: 1,
									expoPushToken: 1,
								},
							},
						],
						as: 'users',
					},
				},
				{
					$project: {
						_id: 1,
						expoPushToken: {
							$map: {
								input: '$users',
								as: 'u',
								in: '$$u.expoPushToken',
							},
						},
						receiverIds: {
							$map: {
								input: '$users',
								as: 'u',
								in: '$$u._id',
							},
						},
					},
				},
			]);
			if (!receiverInfo) throw new Error('Lỗi không tìm thấy tòa nhà !');

			receiverIds = receiverInfo.receiverIds;
			expoPushTokens = receiverInfo.expoPushToken;
		}

		const createNoti = await createNotification(type, { ...payload, receiverIds });

		const result = await sendNotification(type, { ...createNoti, expoPushTokens });
		return result;
	} catch (error) {
		console.error('❌ Worker error:', error.message);
		throw error;
	}
});

generateContractQueue.process(async (job) => {
	try {
		const {
			contractSignDate,
			contractEndDate,
			contractTerm,
			depositAmount,
			rent,
			feesData = [],
			interiors = [],
			buildingId,
			contractId,
			roomId,
		} = job.data;

		console.log('log of generateContractData: ', job.data);

		// Validate ObjectId
		if (!mongoose.isValidObjectId(buildingId)) throw new Error('Invalid buildingId');
		if (!mongoose.isValidObjectId(contractId)) throw new Error('Invalid contractId');
		if (!mongoose.isValidObjectId(roomId)) throw new Error('Invalid roomId');

		const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
		const contractObjectId = new mongoose.Types.ObjectId(contractId);
		const roomObjectId = new mongoose.Types.ObjectId(roomId);

		const customerInfo = await Entity.CustomersEntity.findOne({ room: roomObjectId, isContractOwner: true, status: { $in: [1, 2] } });
		if (!customerInfo) throw new Error('Lỗi không tìm thấy khách hàng !');
		// Helpers
		const formatDate = (date) => ({
			DAY: moment(date).utcOffset('+07:00').format('DD'),
			MONTH: moment(date).utcOffset('+07:00').format('MM'),
			YEAR: moment(date).utcOffset('+07:00').format('YYYY'),
		});

		const FEE_UNIT_TYPE = {
			index: '/Số',
			person: '/Người',
			vehicle: '/Xe',
			room: '/Phòng',
		};

		const feesContractData = feesData.map((fee) => ({
			NAME: fee.feeName,
			AMOUNT: String(fee.feeAmount ?? ''),
			TYPE: FEE_UNIT_TYPE[fee.unit] || '',
		}));

		const interiorContractData = interiors.map((item) => ({
			NAME: item.interiorName,
			QUANT: String(item.quantity ?? ''),
		}));

		const contractDocData = {
			CREATED_DATE: formatDate(new Date()),
			PARTY_B: {
				FULLNAME: customerInfo.fullName,
				DOB: moment(customerInfo.dob).format('DD/MM/YYYY'),
				ADDRESS: customerInfo.address,
				CCCD: customerInfo.cccd,
				CCCD_DATE: moment(customerInfo.cccdIssueDate).format('DD/MM/YYYY'),
				CCCD_AT: customerInfo.cccdIssueAt,
				PHONE: customerInfo.phone,
			},
			FEES: feesContractData,
			INTERIORS: interiorContractData,
			DEPOSIT: String(depositAmount ?? ''),
			SIGN_DATE: formatDate(contractSignDate),
			END_DATE: formatDate(contractEndDate),
			CONTRACT_TERM: contractTerm,
			ROOM_PRICE: String(rent ?? 0),
		};

		console.time('generateContract take');
		const contractPdfUrl = await generateContract(contractDocData, buildingObjectId);
		console.timeEnd('generateContract take');

		console.log('log of contractPdfUrl:', contractPdfUrl);

		const updateContract = await Entity.ContractsEntity.findOneAndUpdate(
			{ _id: contractObjectId },
			{ $set: { contractPdfUrl: contractPdfUrl.Key, contractPdfFile: contractDocData } },
			{ new: true }, // return updated version
		);

		//ZNS to customer by phone here
		return updateContract;
	} catch (error) {
		console.error('❌ Worker error:', error);
		throw error; // Bull will mark the job as failed
	}
});

modifyContractQueue.process(async (job) => {
	console.log('log of modifyContractData: ', job.data);

	const { contractId, buildingId, rent } = job.data;
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	// 1️⃣ Lấy contract trước, không giữ transaction lâu
	const contract = await Entity.ContractsEntity.findById(contractId);
	if (!contract) throw new Error('Hợp đồng không tồn tại !');

	// 2️⃣ Clone contractPdfFile và cập nhật ROOM_PRICE
	const updatedPdfFile = {
		...contract.contractPdfFile,
		ROOM_PRICE: rent.toString(),
	};

	// 3️⃣ Generate PDF (tốn thời gian) - ngoài transaction
	console.time('generateContract take');
	const contractPdfUrl = await generateContract(updatedPdfFile, buildingObjectId);
	console.timeEnd('generateContract take');

	// 4️⃣ Bắt đầu transaction ngắn, chỉ để update DB

	try {
		contract.contractPdfFile = updatedPdfFile;
		contract.contractPdfUrl = contractPdfUrl;

		await contract.save();

		await session.commitTransaction();
		return contract;
	} catch (error) {
		console.error('❌ Worker error during DB update:', error);
		throw error;
	}
});

console.log('🚀 Worker is running and listening for jobs...');
