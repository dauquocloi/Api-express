const { InternalError, NotFoundError } = require('../AppError');
const Entity = require('../models');

exports.findBankAccountByAccountNumber = (accountNumber) => {
	return Entity.BankAccountsEntity.findOne({ accountNumber });
};

exports.findById = (bankAccountId) => Entity.BankAccountsEntity.findById(bankAccountId);

exports.findByBuildingId = (buildingId) => Entity.BankAccountsEntity.findOne({ buildings: buildingId });

exports.importBankAccount = async ({ accountNumber, accountName, bankId, ownerId, buildingId }, session = null) => {
	const [result] = await Entity.BankAccountsEntity.create(
		[
			{
				accountNumber,
				accountName,
				bank: bankId,
				buildings: [buildingId],
				user: ownerId,
			},
		],
		{ session },
	);
	if (!result) throw new InternalError('Thêm tài khoản ngân hàng thất bại');

	return result.toObject();
};

exports.checkExistBankAccount = async ({ buildingId }, session = null) => {
	const result = await Entity.BankAccountsEntity.findOne({ buildings: buildingId }).session(session);
	if (!result)
		throw new NotFoundError('Tòa nhà chưa có thông tin thanh toán, vui lòng tạo thông tin thanh toán cho tòa nhà trước khi khởi tạo hóa đơn.');
	return result.toObject();
};
