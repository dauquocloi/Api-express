const mongoose = require('mongoose');
const Services = require('../../service');
const { BadRequestError } = require('../../AppError');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const ROLES = require('../../constants/userRoles');
const uploadFile = require('../../utils/uploadFile');
const deleteFileFromS3 = require('../../utils/deleteFileFromS3');

exports.importBuilding = async (data) => {
	let contractDocxUrlKey;
	let contractPdfUrlKey;
	let depositTermUrlKey;
	const {
		buildingName,
		buildingAddress,
		roomQuantity,
		invoiceNotes,
		contractDocxUrl,
		contractPdfUrl,
		depositTermUrl,
		ownerId,
		companyId,
		paymentConfirmationMode,
	} = data;
	try {
		const user = await Services.users.findById(ownerId).lean().exec();
		if (!user) throw new BadRequestError('User not found !');

		const company = await Services.companies.findById(companyId).lean().exec();
		if (!company) throw new BadRequestError('Company not found !');

		[contractDocxUrlKey, contractPdfUrlKey, depositTermUrlKey] = await Promise.all([
			contractDocxUrl?.[0] ? uploadFile(contractDocxUrl[0]) : null,

			contractPdfUrl?.[0] ? uploadFile(contractPdfUrl[0]) : null,

			depositTermUrl?.[0] ? uploadFile(depositTermUrl[0]) : null,
		]);

		console.log('log of uploadedKeys', contractDocxUrlKey, contractPdfUrlKey, depositTermUrlKey);

		const buildingCreated = await Services.buildings.importBuilding({
			buildingSortName: buildingName,
			buildingAddress: buildingAddress,
			roomQuantity: roomQuantity,
			invoiceNotes: invoiceNotes ?? '',

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
			paymentConfirmationMode,
		});

		return {
			buildingId: buildingCreated._id,
			userId: user._id,
		};
	} catch (error) {
		const [removeContractDocx, removeContractPdf, removeDepositTermUrl] = await Promise.all([
			contractDocxUrlKey?.Key ? deleteFileFromS3(contractDocxUrlKey.Key) : null,

			contractPdfUrlKey?.Key ? deleteFileFromS3(contractPdfUrlKey.Key) : null,

			depositTermUrlKey?.Key ? deleteFileFromS3(depositTermUrlKey.Key) : null,
		]);

		console.log('file removed ', removeContractDocx, removeContractPdf, removeDepositTermUrl);
		throw error;
	}
};

exports.importPaymentInfo = async (buildingId, bankAccountId) => {
	const currentBuilding = await Services.buildings.findById(buildingId).lean().exec();
	if (!currentBuilding) throw new BadRequestError('Tòa nhà không tồn tại');

	const currentBankAccount = await Services.bankAccounts.findById(bankAccountId).lean().exec();
	if (!currentBankAccount) throw new BadRequestError('Tài khoản ngân hàng không tồn tại');

	const result = await Services.buildings.importPaymentInfo(buildingId, bankAccountId);
	return result;
};

exports.getBuildingsByUserId = async (userId) => {
	const buildings = await Services.buildings.findByManagementId(userId).lean().exec();

	return buildings;
};
