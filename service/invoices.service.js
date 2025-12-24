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

exports.findById = async (invoiceId) => {
	const invoiceInfo = await Entity.InvoicesEntity.findById(invoiceId);
	return invoiceInfo;
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
	if (result.n === 0) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	return result;
};

exports.getInvoiceInfoByInvoiceCode = async (invoiceCode) => {
	const [invoiceInfo] = await Entity.InvoicesEntity.aggregate(Pipelines.invoices.getInvoiceInfoByInvoiceCode(invoiceCode));
	return invoiceInfo;
};
