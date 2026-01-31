const { InternalError } = require('../AppError');
const Entity = require('../models');

exports.findBankAccountByAccountNumber = (accountNumber) => {
	return Entity.BankAccountsEntity.findOne({ accountNumber });
};

exports.findById = (bankAccountId) => Entity.BankAccountsEntity.findById(bankAccountId);

exports.importBankAccount = async (accountNumber, accountName, bankId, ownerId) => {
	const result = await Entity.BankAccountsEntity.create({
		accountNumber,
		accountName,
		bank: bankId,
		user: ownerId,
	});
	if (!result) throw new InternalError('Thêm tài khoản ngân hàng thất bại');

	return result.toObject();
};
