const Entity = require('../models');

exports.findBankAccountByAccountNumber = (accountNumber) => {
	return Entity.BankAccountsEntity.findOne({ accountNumber: accountNumber.trim() });
};
