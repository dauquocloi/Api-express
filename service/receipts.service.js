const { InternalError, NotFoundError, ConflictError } = require('../AppError');
const Entity = require('../models');
const generatePaymentContent = require('../utils/generatePaymentContent');
const { calculateReceiptStatusAfterModified } = require('./receipts.helper');
const Pipelines = require('./aggregates');
const { receiptStatus } = require('../constants/receipt');

exports.findById = (receiptId) => {
	return Entity.ReceiptsEntity.findById(receiptId);
};

exports.closeAndSetDetucted = async (receiptIds, detuctedType, detuctedId, session) => {
	const result = await Entity.ReceiptsEntity.updateMany(
		{ _id: { $in: receiptIds } },
		{
			$set: {
				locked: true,
				detuctedInfo: { detuctedType, detuctedId },
			},
			$inc: { version: 1 },
		},
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
		date,
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
				date: date ?? new Date(),
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

exports.modifyReceipt = async ({ receiptObjectId, receiptVersion, receiptAmount, receiptContent }, session) => {
	const result = await Entity.ReceiptsEntity.findOneAndUpdate(
		{
			_id: receiptObjectId,
			version: receiptVersion,
			amount: { $ne: Number(receiptAmount) },
		},
		{
			$set: {
				receiptContent,
				amount: Number(receiptAmount),
				status: {
					$cond: [
						{
							$gte: ['$paidAmount', Number(receiptAmount)],
						},
						`${receiptStatus['PAID']}`,
						`${receiptStatus['PARTIAL']}`,
					],
				},
			},
			$inc: { version: 1 },
		},
		{
			session,
			returnDocument: 'before',
		},
	);

	if (!result) {
		throw new ConflictError('Hóa đơn đã bị thay đổi hoặc dữ liệu không hợp lệ');
	}

	return result._id;
};

exports.modifyDepositReceipt = async ({ receiptObjectId, receiptAmount }, session) => {
	const currentReceipt = await Entity.ReceiptsEntity.findOne({ _id: receiptObjectId }, { amount: 1, version: 1, paidAmount: 1 })
		.session(session)
		.lean()
		.exec();
	if (!currentReceipt) throw new NotFoundError('Hóa đơn không tồn tại');
	if (currentReceipt.amount === receiptAmount) return currentReceipt._id;

	const receiptStatus = calculateReceiptStatusAfterModified(currentReceipt.paidAmount, receiptAmount);
	const result = await Entity.ReceiptsEntity.findOneAndUpdate(
		{
			_id: receiptObjectId,
			version: currentReceipt.version,
		},
		{
			$set: {
				amount: receiptAmount,
				status: receiptStatus,
			},
			$inc: { version: 1 },
		},
		{
			session,
		},
	);
	console.log('result form modifyReceipts: ', result);

	if (!result) {
		throw new ConflictError('Dữ liệu này đã bị ai đó thay đổi !');
	}

	return result._id;
};

exports.getReceiptInfoByReceiptCode = async (receiptCode) => {
	const [result] = await Entity.ReceiptsEntity.aggregate(Pipelines.receipts.getReceiptInfoByReceiptCode(receiptCode));
	return result;
};
