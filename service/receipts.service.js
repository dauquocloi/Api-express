const { InternalError, NotFoundError } = require('../AppError');
const Entity = require('../models');
const generatePaymentContent = require('../utils/generatePaymentContent');
const Pipelines = require('./aggregates');

exports.closeAndSetDetucted = async (receiptIds, detuctedType, detuctedId, session) => {
	const result = await Entity.ReceiptsEntity.updateMany(
		{ _id: { $in: receiptIds } },
		{ $set: { locked: true, detuctedInfo: { detuctedType, detuctedId } } },
		{ session },
	);

	if (result.matchedCount === 0) throw new NotFoundError('Không tìm thấy bản ghi!');

	return result;
};

exports.createReceipt = async (
	{
		roomObjectId,
		receiptAmount,
		payer,
		currentPeriod,

		receiptContent,
		receiptType,
		initialStatus,
	},
	session,
) => {
	const receiptCode = await generatePaymentContent(process.env.PAYMENT_CONTENT_LENGTH);
	const paymentContent = await generatePaymentContent(process.env.INVOICE_CODE_LENGTH);
	const [result] = await Entity.ReceiptsEntity.create(
		[
			{
				room: roomObjectId,
				receiptContent: receiptContent,
				amount: Number(receiptAmount),
				paidAmount: 0,
				carriedOverPaidAmount: 0,
				payer: payer,
				receiptType: receiptType,
				status: initialStatus,
				isContractCreated: false,
				month: currentPeriod.currentMonth,
				year: currentPeriod.currentYear,
				locked: false,
				receiptCode,
				paymentContent,
			},
		],
		{ session },
	);
	if (!result) throw new InternalError('Can not create receipt');
	return result;
};

exports.getReceiptDetail = async (receiptId, session) => {
	let query = Entity.ReceiptsEntity.findOne({ _id: receiptId });
	if (session) {
		query = query.session(session);
	}
	const result = await query.lean().exec();
	if (!result) throw new NotFoundError('Không tìm thấy bản ghi!');
	return result;
};

exports.getReceiptAndTransDetail = async (receiptObjectId) => {
	const [result] = await Entity.ReceiptsEntity.aggregate(Pipelines.receipts.getReceiptDetail(receiptObjectId));
	if (!result) throw new NotFoundError('Hóa đơn không tồn tại');
	return result;
};

exports.getDepositReceiptDetail = async (receiptObjectId) => {
	const [result] = await Entity.ReceiptsEntity.aggregate(Pipelines.receipts.getDepositReceiptDetail(receiptObjectId));
	if (!result) throw new NotFoundError('Hóa đơn đặt cọc không tồn tại');
	return result;
};

exports.getListReceiptsPaymentStatus = async (buildingObjectId, month, year) => {
	const [result] = await Entity.BuildingsEntity.aggregate(Pipelines.receipts.getReceiptPaymentStatus(buildingObjectId, month, year));
	return result;
};

exports.getCurrentReceiptAndTransaction = async (receiptObjectId, session) => {
	const [result] = await Entity.ReceiptsEntity.aggregate(Pipelines.receipts.getCurrentReceiptAndTransaction(receiptObjectId));
	if (!result) throw new NotFoundError('Hóa đơn không tồn tại');
	return result;
};
