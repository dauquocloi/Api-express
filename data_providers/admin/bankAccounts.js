const Services = require('../../service');
const { BadRequestError } = require('../../AppError');

exports.importBankAccount = async (userId, bankAccount, bankName, bankId) => {
	const currentUser = await Services.users.findById(userId).lean().exec();
	if (!currentUser) throw new BadRequestError('Người dùng không tồn tại');
	const currentBank = await Services.banks.findById(bankId).lean().exec();
	if (!currentBank) throw new BadRequestError('Thông tin ngân hàng không tồn tại !');
	const checkExistedBankAccount = await Services.bankAccounts.findBankAccountByAccountNumber(bankAccount.trim());
	if (checkExistedBankAccount) throw new BadRequestError('Tài khoản ngân hàng đã tồn tại trong hệ thống');

	const bankAccountCreated = await Services.bankAccounts.importBankAccount(bankAccount.trim(), bankName.trim(), bankId, userId);
	return bankAccountCreated;
};
