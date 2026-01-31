const { NotFoundError } = require('../AppError');
const { CREATED_BY, OWNER_CONFIRMED_STATUS } = require('../constants/transactions');
const Entity = require('../models');
const Pipelines = require('./aggregates');

exports.findById = (transactionId) => Entity.TransactionsEntity.findById(transactionId);

exports.getTransactionsByUserId = async (userObjectId) => {
	const [result] = await Entity.UsersEntity.aggregate(Pipelines.transactions.getTransactionsByUserId(userObjectId));
	if (!result) throw new NotFoundError('User không tồn tại');
	return result;
};

exports.createCashTransaction = async ({ amount, date, type, collectorId, createdBy, id, currentPeriod, idempotencyKey }, session) => {
	const [command] = await Entity.TransactionsEntity.create(
		[
			{
				transactionDate: date,
				amount: amount,
				paymentMethod: 'cash',
				receipt: type === 'receipt' ? id : null,
				invoice: type === 'invoice' ? id : null,
				collector: collectorId,
				createdBy: createdBy,
				transferType: 'credit',
				month: currentPeriod.currentMonth,
				year: currentPeriod.currentYear,
				idempotencyKey: idempotencyKey,
				ownerConfirmed: createdBy === CREATED_BY['MANAGER'] ? OWNER_CONFIRMED_STATUS['PENDING'] : OWNER_CONFIRMED_STATUS['CONFIRMED'],
				isTransactionDetected: true,
			},
		],
		{ session },
	);
	return command;
};

exports.generateTransferTransactionBySepay = async (
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
				isTransactionDetected: true,
				invoice: invoice,
				receipt: receipt,
				month: currentPeriod.currentMonth,
				year: currentPeriod.currentYear,
				gateway,
				createdBy: CREATED_BY['SEPAY'],
			},
		],
		{ session },
	);
	return result.toObject();
};

exports.generateTransferTransactionByManagement = async (
	{ amount, idempotencyKey, collector, createdBy, date, invoice = null, receipt = null, month, year },
	session,
) => {
	const [result] = await Entity.TransactionsEntity.create(
		[
			{
				amount,
				paymentMethod: 'transfer',
				transferType: 'credit',
				collector,
				createdBy,
				ownerConfirmed: createdBy === CREATED_BY['MANAGER'] ? OWNER_CONFIRMED_STATUS['PENDING'] : OWNER_CONFIRMED_STATUS['CONFIRMED'],
				idempotencyKey,
				transactionDate: date,
				invoice: invoice,
				receipt: receipt,
				isTransactionDetected: true,
				confirmedDate: new Date(),
				month: month,
				year: year,
			},
		],
		{ session },
	);
	return result.toObject();
};

exports.confirmTransaction = async (transactionId) => {
	const result = await Entity.TransactionsEntity.updateOne(
		{ _id: transactionId },
		{ $set: { ownerConfirmed: OWNER_CONFIRMED_STATUS['CONFIRMED'], confirmedDate: new Date() } },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Không tìm thấy bản ghi!');

	return true;
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

exports.importCashTransactions = async (data, session) => {
	const transactionData = data.map((data) => ({
		transactionDate: data.createdAt,
		createdAt: data.createdAt,
		updatedAt: data.createdAt,
		amount: data.amount,
		paymentMethod: 'cash',
		receipt: data.receipt,
		collector: data.collector,
		month: data.month,
		year: data.year,
		isTransactionDetected: true,
		createdBy: CREATED_BY['OWNER'],
	}));
	const result = await Entity.TransactionsEntity.insertMany(transactionData, { session, timestamps: false });
	return result;
};

exports.transformCashPaymentMethod = async (transactionId, session) => {
	const result = await Entity.TransactionsEntity.updateOne({ _id: transactionId }, { $set: { paymentMethod: 'cash' } }, { session });
	if (result.matchedCount === 0) throw new NotFoundError('Giao dịch không tồn tại');
	return true;
};

exports.removeTransaction = async (transactionId, session) => Entity.TransactionsEntity.deleteOne({ _id: transactionId }, { session });

exports.getAllTransactionsInPeriod = async (buildingObjectId, currentMonth, currentYear, session) => {
	const [result] = await Entity.BuildingsEntity.aggregate(
		Pipelines.transactions.getAllTransactionsInPeriod(buildingObjectId, currentMonth, currentYear),
	).session(session);

	return result;
};
