const { default: mongoose } = require('mongoose');
const Services = require('../service');
const { NotFoundError, BadRequestError } = require('../AppError');
const { paymentConfirmationMode } = require('../constants/buildings');

exports.getBankAccountInfo = async (buildingId) => {
	const result = await Services.bankAccounts.findByBuildingId(buildingId).populate('bank').lean().exec();
	return result || null;
};

exports.createBankAccount = async ({ accountNumber, accountName, bankId, buildingId, userId }) => {
	const building = await Services.buildings.findById(buildingId).lean().exec();
	if (!building) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');
	if (building.paymentConfirmationMode === paymentConfirmationMode['AUTO'])
		throw new BadRequestError('Trạng thái xác nhận thanh toán tòa nhà không phù hợp để thực hiện tác vụ này');

	const bank = await Services.banks.findById(bankId).lean().exec();
	if (!bank) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');

	const bankAccountCreated = await Services.bankAccounts.importBankAccount({
		accountNumber: accountNumber,
		accountName: accountName,
		buildingId: buildingId,
		bankId: bankId,
		ownerId: userId,
	});

	return {
		_id: bankAccountCreated._id,
	};
};

exports.editBankAccount = async ({ bankId, accountNumber, accountName, buildingId }) => {};

exports.removeBankAccount = async (bankAccountId) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentBankAccount = await Services.bankAccounts.findById(bankAccountId).session(session).lean().exec();
			if (!currentBankAccount) throw new NotFoundError('Tài khoản ngân hàng không tồn tại');

			await Services.bankAccounts.removeBankAccount(bankAccountId, session);
		});
	} finally {
		if (session) session.endSession();
	}
};
