const { NotFoundError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');

exports.getTransactionsByUserId = async (userObjectId) => {
	const [result] = await Entity.UsersEntity.aggregate(Pipelines.transactions.getTransactionsByUserId(userObjectId));
	if (!result) throw new NotFoundError('User không tồn tại');
	return result;
};

exports.createCashTransaction = async ({ amount, date, type, collectorId, id, currentPeriod, idempotencyKey }, session) => {
	const [command] = await Entity.TransactionsEntity.create(
		[
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
		],
		{ session },
	);
	return command;
};

exports.generateTransferTransaction = async (
	{
		bankAccountId,
		transactionDate,
		accountNumber,
		paymentCode,
		content,
		amount,
		referenceCode,
		transactionId,
		gateway,
		idempotencyKey,
		currentPeriod,
		invoice = null,
		receipt = null,
	},
	session,
) => {
	const [result] = await Entity.TransactionsEntity.create(
		[
			{
				bankAccountId,
				transactionDate,
				accountNumber,
				paymentCode,
				content,
				amount,
				referenceCode,
				transactionId,
				idempotencyKey,
				paymentMethod: 'transfer',
				isTransactionDetected: false,
				invoice: invoice,
				receipt: receipt,
				month: currentPeriod.currentMonth,
				year: currentPeriod.currentYear,
				gateway,
			},
		],
		{ session },
	);
	return result.toObject();
};

exports.generateUnDetectedTransaction = async (
	{ bankAccountId, transactionDate, accountNumber, paymentCode, content, amount, referenceCode, transactionId, idempotencyKey },
	session,
) => {
	const result = await Entity.TransactionsEntity.create(
		[
			{
				bankAccountId,
				transactionDate,
				accountNumber,
				paymentCode,
				content,
				amount,
				referenceCode,
				transactionId,
				idempotencyKey,
				paymentMethod: 'transfer',
				isTransactionDetected: false,
				invoice: null,
				receipt: null,
				month: null,
				year: null,
			},
		],
		{ session },
	);
	return result;
};

exports.checkExistedTransaction = async (transactionid, session) => {
	return await Entity.TransactionsEntity.findOne({ transactionId: transactionid }).session(session);
};
