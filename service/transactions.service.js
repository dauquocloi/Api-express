const { NotFoundError, ConflictError, InternalError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');
const { PAYMENT_METHOD, CREATED_BY, OWNER_CONFIRMED_STATUS, billType } = require('../constants');

exports.findById = (transactionId) => Entity.TransactionsEntity.findById(transactionId);

exports.getTransactionsByUserId = async (userObjectId) => {
	const [result] = await Entity.UsersEntity.aggregate(Pipelines.transactions.getTransactionsByUserId(userObjectId));
	if (!result) throw new NotFoundError('User không tồn tại');
	return result;
};

exports.createCashTransaction = async ({ amount, date, type, collectorId, createdBy, id, currentPeriod, idempotencyKey }) => {
	const result = await Entity.TransactionsEntity.create({
		transactionDate: date,
		amount: amount,
		paymentMethod: PAYMENT_METHOD['CASH'],
		receipt: type === billType['RECEIPT'] ? id : null,
		invoice: type === billType['INVOICE'] ? id : null,
		collector: collectorId,
		createdBy: createdBy,
		transferType: 'credit',
		month: currentPeriod.currentMonth,
		year: currentPeriod.currentYear,
		idempotencyKey: idempotencyKey,
		ownerConfirmed: createdBy === CREATED_BY['MANAGER'] ? OWNER_CONFIRMED_STATUS['PENDING'] : OWNER_CONFIRMED_STATUS['CONFIRMED'],
		isTransactionDetected: true,
	});
	if (!result) throw new InternalError('Create cash transaction fail');
	return result;
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
				paymentMethod: PAYMENT_METHOD['TRANSFER'],
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

exports.generateTransferTransactionByManagement = async ({
	amount,
	idempotencyKey,
	collector,
	createdBy,
	date,
	invoice = null,
	receipt = null,
	month,
	year,
}) => {
	const result = await Entity.TransactionsEntity.create({
		amount,
		paymentMethod: PAYMENT_METHOD['TRANSFER'],
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
	});
	if (!result) throw new InternalError('Create transfer transaction fail');
	return result.toObject();
};

exports.confirmTransaction = async (transactionId) => {
	const result = await Entity.TransactionsEntity.updateOne(
		{ _id: transactionId },
		{ $set: { ownerConfirmed: OWNER_CONFIRMED_STATUS['CONFIRMED'], confirmedDate: new Date() } },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Không tìm thấy bản ghi!');
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
				paymentMethod: PAYMENT_METHOD['TRANSFER'],
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

exports.checkExistedTransaction = async (transactionid) => {
	return await Entity.TransactionsEntity.findOne({ transactionId: transactionid });
};

exports.importCashTransactions = async (data) => {
	const transactionData = data.map((data) => ({
		transactionDate: data.createdAt,
		createdAt: data.createdAt,
		updatedAt: data.createdAt,
		amount: data.amount,
		paymentMethod: PAYMENT_METHOD['CASH'],
		receipt: data.receipt,
		collector: data.collector,
		month: data.month,
		year: data.year,
		isTransactionDetected: true,
		createdBy: CREATED_BY['OWNER'],
		ownerConfirmed: OWNER_CONFIRMED_STATUS['CONFIRMED'],
		confirmedDate: data.createdAt,
	}));
	const result = await Entity.TransactionsEntity.insertMany(transactionData, { timestamps: false });
	return result;
};

exports.getAllTransactionsInPeriod = async (buildingObjectId, currentMonth, currentYear) => {
	const [result] = await Entity.BuildingsEntity.aggregate(
		Pipelines.transactions.getAllTransactionsInPeriod(buildingObjectId, currentMonth, currentYear),
	);

	return result;
};

exports.updateOwnerConfirmationStatus = async ({ transactionId, ownerConfirmationStatus, version, ownerDeclinedReason = '' }) => {
	const result = await Entity.TransactionsEntity.updateOne(
		{ _id: transactionId, version: version },
		{ $set: { ownerConfirmed: ownerConfirmationStatus, ownerDeclinedReason }, $inc: { version: 1 } },
	);

	if (!result) throw new ConflictError('Giao dịch đã bị thay đổi, vui lòng tải lại trang !');

	return true;
};
