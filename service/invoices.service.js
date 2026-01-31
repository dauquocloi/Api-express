const { InternalError, NotFoundError, ConflictError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const Entity = require('../models');
const { generateInvoiceFees } = require('./invoices.helper');
const { calculateTotalFeeAmount } = require('../utils/calculateFeeTotal');
const generatePaymentContent = require('../utils/generatePaymentContent');
const Pipelines = require('./aggregates');
const { invoiceStatus } = require('../constants/invoices');

exports.findByIdQuery = async (invoiceId, session) => {
	const query = Entity.InvoicesEntity.findById(invoiceId);
	if (session) query.session(session);

	const invoiceInfo = await query.lean().exec();
	if (!invoiceInfo) throw new NotFoundError('Hóa đơn không tồn tại');
	return invoiceInfo;
};

exports.findById = (invoiceId) => {
	return Entity.InvoicesEntity.findById(invoiceId);
};

exports.closeAndSetDetucedInvoice = async (invoiceId, detuctedType, detuctedId, session) => {
	const result = await Entity.InvoicesEntity.findOneAndUpdate(
		{ _id: invoiceId },
		{
			$set: {
				locked: true,
				isDepositDeducted: true,
				detuctedInfo: {
					detuctedType,
					detuctedId,
				},
			},
			$inc: {
				version: 1,
			},
		},
		{ session },
	);
	if (result.matchedCount === 0) throw new AppError(errorCodes.notExist, 'Không tìm thấy bản ghi!', 404);

	return result;
};

exports.createInvoice = async (
	{
		roomId,
		listFees,
		totalInvoiceAmount,

		stayDays,
		debtInfo,
		currentPeriod,
		payerName,
		creater,
		initialStatus = invoiceStatus['UNPAID'],
	},

	session,
) => {
	const paymentContent = await generatePaymentContent(process.env.PAYMENT_CONTENT_LENGTH);
	const invoiceCode = await generatePaymentContent(process.env.INVOICE_CODE_LENGTH);

	if (!paymentContent || !invoiceCode) throw new InternalError('Can not generate payment content');

	const [newInvoice] = await Entity.InvoicesEntity.create(
		[
			{
				stayDays: stayDays,
				month: currentPeriod.currentMonth,
				year: currentPeriod.currentYear,
				room: roomId,
				status: initialStatus,
				fee: listFees,
				total: totalInvoiceAmount,
				paidAmount: 0,
				debts: debtInfo ?? null,
				paymentContent,
				invoiceCode,
				invoiceContent: `Hóa đơn tiền nhà kỳ ${currentPeriod.currentMonth}, ${currentPeriod.currentYear}`,
				payer: payerName,
				creater: creater,
				locked: false,
				invoiceType: 'rental',
			},
		],
		{ session },
	);

	if (!newInvoice) throw new InternalError('Can not create invoice');

	return newInvoice;
};

exports.getInvoiceDetail = async (invoiceObjectId) => {
	const [invoiceDetail] = await Entity.InvoicesEntity.aggregate(Pipelines.invoices.getInvoiceDetail(invoiceObjectId));
	if (!invoiceDetail) throw new NotFoundError('Hóa đơn không tồn tại');
	return invoiceDetail;
};

exports.getInvoiceInfo = async (invoiceId, session) => {
	const query = Entity.InvoicesEntity.findById(invoiceId);
	if (session) query.session(session);
	const invoiceInfo = await query.lean().exec();
	if (!invoiceInfo) throw new NotFoundError('Hóa đơn không tồn tại');
	return invoiceInfo;
};

exports.modifyInvoice = async ({ total, fee, status, stayDays, invoiceId, version }, session) => {
	const result = await Entity.InvoicesEntity.updateOne(
		{ _id: invoiceId, version: version },
		{
			$set: {
				total: total,
				fee: fee,
				status: status,
				stayDays: stayDays,
			},
			$inc: {
				version: 1,
			},
		},
		{ session },
	);
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	return result;
};

exports.getInvoiceInfoByInvoiceCode = async (invoiceCode) => {
	const normalizedInvoiceCode = invoiceCode.toString().trim().replace(/\s+/g, '').toUpperCase();
	const [invoiceInfo] = await Entity.InvoicesEntity.aggregate(Pipelines.invoices.getInvoiceInfoByInvoiceCode(normalizedInvoiceCode));
	return invoiceInfo;
};

exports.unLockInvoice = async (invoiceId) => {
	const result = await Entity.InvoicesEntity.findOneAndUpdate({ _id: invoiceId }, { $set: { locked: false } }, { new: true });
	if (!result) throw new NotFoundError('Hóa đơn không tồn tại');
	return result;
};

exports.rollBackInvoiceAtCheckoutCost = async (invoiceId, session) => {
	const result = await Entity.InvoicesEntity.updateOne(
		{
			_id: invoiceId,
		},
		{
			$set: {
				locked: false,
				detuctedInfo: null,
			},
			$inc: { version: 1 },
		},
		{ session },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Hóa đơn không tồn tại !');
	return result;
};

exports.findInvoiceInfoByPaymentContent = async (paymentContent) => {
	const normalizedPaymentContent = paymentContent.toString().trim().replace(/\s+/g, '').toUpperCase();
	const [result] = await Entity.InvoicesEntity.aggregate(Pipelines.invoices.findInvoiceInfoByPaymentContent(normalizedPaymentContent));
	if (!result) return null;
	return result;
};

exports.updateInvoicePaidStatus = async ({ invoiceId, paidAmount, invoiceStatus }, session) => {
	const result = await Entity.InvoicesEntity.findOneAndUpdate(
		{ _id: invoiceId },
		{
			$set: { paidAmount, status: invoiceStatus },
			$inc: { version: 1 },
		},
		{ session },
	);
	if (!result) return null;
	return result;
};

exports.updateInvoicePaidStatusWithVersion = async ({ invoiceId, paidAmount, invoiceStatus, version }, session) => {
	const result = await Entity.InvoicesEntity.findOneAndUpdate(
		{ _id: invoiceId, version: version },
		{
			$set: { paidAmount, status: invoiceStatus },
			$inc: { version: 1 },
		},
		{ session },
	);
	if (!result) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	return result;
};

exports.closeAllInvoices = async (invoiceIds, session) => {
	const result = await Entity.InvoicesEntity.updateMany(
		{ _id: { $in: invoiceIds } },
		{ $set: { locked: true }, $inc: { version: 1 } },
		{ session },
	);
	return result;
};

exports.removeDetuctedInfo = async (invoiceId, session) => {
	const result = await Entity.InvoicesEntity.updateOne({ _id: invoiceId }, { $set: { detuctedInfo: null }, $inc: { version: 1 } }, { session });
	if (result.matchedCount === 0) throw new NotFoundError('Hóa đơn không tồn tại !');
	return result;
};

exports.getCashCollectorInfo = async (invoiceObjectId) => {
	const [cashCollectorInfo] = await Entity.InvoicesEntity.aggregate(Pipelines.invoices.getCashCollectorInfo(invoiceObjectId));
	return cashCollectorInfo;
};
