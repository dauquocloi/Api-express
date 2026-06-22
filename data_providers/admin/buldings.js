const mongoose = require('mongoose');
const Services = require('../../service');
const { BadRequestError } = require('../../AppError');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const ROLES = require('../../constants/userRoles');
const uploadFile = require('../../utils/uploadFile');
const deleteFileFromS3 = require('../../utils/deleteFileFromS3');

exports.importBuilding = async (data) => {
	let session;
	let contractDocxUrlKey;
	let contractPdfUrlKey;
	let depositTermUrlKey;
	try {
		session = await mongoose.startSession();
		return await session.withTransaction(async () => {
			const user = await Services.users.findById(data.ownerId).lean().exec();
			if (!user) throw new BadRequestError('User not found !');

			const company = await Services.companies.findById(data.companyId).session(session).lean().exec();
			if (!company) throw new BadRequestError('Company not found !');

			[contractDocxUrlKey, contractPdfUrlKey, depositTermUrlKey] = await Promise.all([
				data.contractDocxUrl?.[0] ? uploadFile(data.contractDocxUrl[0]) : null,

				data.contractPdfUrl?.[0] ? uploadFile(data.contractPdfUrl[0]) : null,

				data.depositTermUrl?.[0] ? uploadFile(data.depositTermUrl[0]) : null,
			]);

			console.log('log of uploadedKeys', contractDocxUrlKey, contractPdfUrlKey, depositTermUrlKey);

			const buildingCreated = await Services.buildings.importBuilding(
				{
					buildingSortName: data.buildingName,
					buildingAddress: data.buildingAddress,
					roomQuantity: data.roomQuantity,
					invoiceNotes: data?.invoiceNotes ?? '',

					contractDocxUrl: contractDocxUrlKey.Key ?? '',
					contractPdfUrl: contractPdfUrlKey.Key ?? '',
					depositTermUrl: depositTermUrlKey.Key ?? '',

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

			// throw new BadRequestError('Stop for testing');

			return {
				buildingId: buildingCreated._id,
				userId: user._id,
			};
		});
	} catch (error) {
		const [removeContractDocx, removeContractPdf, removeDepositTermUrl] = await Promise.all([
			deleteFileFromS3(contractDocxUrlKey.Key),

			deleteFileFromS3(contractPdfUrlKey.Key),

			deleteFileFromS3(depositTermUrlKey.Key),
		]);

		console.log('file removed ', removeContractDocx, removeContractPdf, removeDepositTermUrl);
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
