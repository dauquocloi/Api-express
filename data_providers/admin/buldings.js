const mongoose = require('mongoose');
const Services = require('../../service');
const { BadRequestError } = require('../../AppError');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const ROLES = require('../../constants/userRoles');
const uploadFile = require('../../utils/uploadFile');

exports.importBuilding = async (data) => {
	let session;

	try {
		session = await mongoose.startSession();
		return await session.withTransaction(async () => {
			const user = await Services.users.findUserByPhone(data.ownerId, session);
			if (!user) throw new BadRequestError('User not found !');

			const company = await Services.companies.findById(data.companyId, session).lean().exec();
			if (!company) throw new BadRequestError('Company not fond !');

			const notificationSettingCreated = await Services.notifications.createNotificationSetting(user._id, session);
			await Services.users.setNotificationSetting(user._id, notificationSettingCreated._id, session);

			const [contractDocxUrlKey, contractPdfUrlKey, depositTermUrlKey] = await Promise.all([
				data.contractDocxUrl?.[0] ? uploadFile(data.contractDocxUrl[0]) : null,

				data.contractPdfUrl?.[0] ? uploadFile(data.contractPdfUrl[0]) : null,

				data.depositTermUrl?.[0] ? uploadFile(data.depositTermUrl[0]) : null,
			]);

			const buildingCreated = await Services.buildings.importBuilding(
				{
					buildingSortName: data.buildingName,
					buildingAddress: data.buildingAddress,
					roomQuantity: data.roomQuantity,
					invoiceNotes: data?.invoiceNotes ?? '',

					contractDocxUrl: contractDocxUrlKey ?? '',
					contractPdfUrl: contractPdfUrlKey ?? '',
					depositTermUrl: depositTermUrlKey ?? '',

					management: [
						{
							role: ROLES['OWNER'],
							user: user._id,
						},
					],
					companyId: company._id,
				},
				session,
			);

			return {
				buildingId: buildingCreated._id,
				userId: user._id,
			};
		});
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
