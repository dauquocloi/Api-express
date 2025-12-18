const { NotFoundError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');

exports.getTransactionsByUserId = async (userObjectId) => {
	const [result] = await Entity.UsersEntity.aggregate(Pipelines.transactions.getTransactionsByUserId(userObjectId));
	if (!result) throw new NotFoundError('User không tồn tại');
	return result;
};

exports.createCashTransaction = async ({ amount, date, type, collectorId, id, currentPeriod, idempotencyKey }, session) => {
	const [command] = await Entity.TransactionsEntity.create([
		{
			transactionDate: date,
			amount: amount,
			paymentMethod: 'cash',
			receipt: type === 'receipt' ? id : null,
			invoice: type === 'invoice' ? id : null,
			collector: collectorId,
			transferType: 'credit',
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
			idempotencyKey: idempotencyKey,
		},
		{ session },
	]);
	return command;
};
