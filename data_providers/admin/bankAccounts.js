const Services = require('../../service');
const { BadRequestError } = require('../../AppError');

exports.importBankAccount = async (data) => {
	const { ownerId, accountNumber, accountName, bankId, buildingId } = data;
	const currentBuilding = await Services.buildings.findById(buildingId).lean().exec();
	if (!currentBuilding) throw new BadRequestError('Tòa nhà không tồn tại');

	const currentUser = await Services.users.findById(ownerId).lean().exec();
	if (!currentUser) throw new BadRequestError('Người dùng không tồn tại');
	const currentBank = await Services.banks.findById(bankId).lean().exec();
	if (!currentBank) throw new BadRequestError('Thông tin ngân hàng không tồn tại !');

	const checkExistedBankAccount = await Services.bankAccounts.findBankAccountByAccountNumber(accountNumber);
	if (checkExistedBankAccount) throw new BadRequestError('Tài khoản ngân hàng đã tồn tại trong hệ thống');
	const buildingBankAccount = await Services.bankAccounts.findByBuildingId(buildingId).lean().exec();
	if (buildingBankAccount) throw new BadRequestError('Tòa nhà đã có tài khoản ngân hàng !');

	const bankAccountCreated = await Services.bankAccounts.importBankAccount({
		accountNumber: accountNumber,
		accountName: accountName,
		bankId: bankId,
		ownerId: ownerId,
		buildingId: buildingId,
	});
	return bankAccountCreated;
};
