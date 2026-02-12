const Services = require('../../service');
const { BadRequestError } = require('../../AppError');

exports.importBankAccount = async (userId, bankAccount, bankName, bankId, buildingId) => {
	const currentBuilding = await Services.buildings.findById(buildingId).lean().exec();
	if (!currentBuilding) throw new BadRequestError('Tòa nhà không tồn tại');

	const currentUser = await Services.users.findById(userId).lean().exec();
	if (!currentUser) throw new BadRequestError('Người dùng không tồn tại');
	const currentBank = await Services.banks.findById(bankId).lean().exec();
	if (!currentBank) throw new BadRequestError('Thông tin ngân hàng không tồn tại !');

	const checkExistedBankAccount = await Services.bankAccounts.findBankAccountByAccountNumber(bankAccount.trim());
	if (checkExistedBankAccount) throw new BadRequestError('Tài khoản ngân hàng đã tồn tại trong hệ thống');
	const buildingBankAccount = await Services.bankAccounts.findByBuildingId(buildingId).lean().exec();
	if (buildingBankAccount) throw new BadRequestError('Tòa nhà đã có tài khoản ngân hàng !');

	const bankAccountCreated = await Services.bankAccounts.importBankAccount(bankAccount.trim(), bankName.trim(), bankId, userId);
	return bankAccountCreated;
};
