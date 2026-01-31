const mongoose = require('mongoose');
const Services = require('../../service');
const { BadRequestError } = require('../../AppError');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const ROLES = require('../../constants/userRoles');
const uploadFile = require('../../utils/uploadFile');

exports.importBuilding = async (data) => {
	let session;
	let result;
	const { ownerInfo } = data;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const user = await Services.users.findUserByPhone(ownerInfo.phone, session);
			if (user) throw new BadRequestError('User already registered');

			const passwordHash = await bcrypt.hash(ownerInfo.phone.trim(), 10);

			const userCreated = await Services.users.importUser(
				{
					username: ownerInfo.phone.trim(),
					role: ROLES['OWNER'],
					password: passwordHash,
					fullName: ownerInfo.fullName,
					phone: ownerInfo.phone.trim(),
					dob: ownerInfo.dob,
					cccd: ownerInfo.cccd,
					cccdIssueDate: ownerInfo.cccdIssueDate,
					cccdIssueAt: ownerInfo.cccdIssueAt.trim(),
					permanentAddress: ownerInfo.permanentAddress.trim(),
				},
				session,
			);

			const notificationSettingCreated = await Services.notifications.createNotificationSetting(userCreated._id, session);
			await Services.users.setNotificationSetting(userCreated._id, notificationSettingCreated._id, session);

			const contractDocxUrlKey = (await uploadFile(data.contractDocxUrl[0])).Key;
			const contractPdfUrlKey = (await uploadFile(data.contractPdfUrl[0])).Key;
			const depositTermUrlKey = await uploadFile(data.depositTermUrl[0]).Key;

			const buildingCreated = await Services.buildings.importBuilding(
				{
					buildingSortName: data.buildingName.trim(),
					buildingAddress: data.buildingAddress.trim(),
					roomQuantity: data.roomQuantity,
					invoiceNotes: data.invoiceNotes?.trim() ?? '',

					contractDocxUrl: contractDocxUrlKey,
					contractPdfUrl: contractPdfUrlKey,
					depositTermUrl: depositTermUrlKey,

					management: [
						{
							role: ROLES['OWNER'],
							user: userCreated._id,
						},
					],
				},
				session,
			);

			result = {
				buildingId: buildingCreated._id,
				userId: userCreated._id,
			};

			return result;
		});

		return result;
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.importPaymentInfo = async (buildingId, bankAccountId) => {
	const currentBuilding = await Services.buildings.findById(buildingId).lean().exec();
	if (!currentBuilding) throw new BadRequestError('Tòa nhà không tồn tại');
	const currentBankAccount = await Services.bankAccounts.findById(bankAccountId).lean().exec();
	if (!currentBankAccount) throw new BadRequestError('Tài khoản ngân hàng không tồn tại');

	await Services.buildings.importPaymentInfo(buildingId, bankAccountId);
	return 'Success';
};

exports.getBuildingsByUserId = async (userId) => {
	const buildings = await Services.buildings.findByManagementId(userId).lean().exec();

	return buildings;
};
