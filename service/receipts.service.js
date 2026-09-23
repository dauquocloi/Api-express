const { InternalError, NotFoundError, ConflictError, BadRequestError } = require('../AppError');
const Entity = require('../models');
const generatePaymentContent = require('../utils/generatePaymentContent');
const Pipelines = require('./aggregates');
const { receiptStatus, receiptTypes } = require('../constants/receipt');
const { getInvoiceStatus } = require('./invoices.helper');

exports.findById = (receiptId) => Entity.ReceiptsEntity.findById(receiptId);

exports.findReceipts = (receiptIds) => Entity.ReceiptsEntity.find({ _id: { $in: receiptIds } });

// exports.findByRoomIds = (roomIds) => Entity.ReceiptsEntity.find({ room: { $in: roomIds } });

exports.closeAndSetDetucted = async (receiptIds, detuctedType, detuctedId) => {
	const result = await Entity.ReceiptsEntity.updateMany(
		{ _id: { $in: receiptIds } },
		{
			$set: {
				locked: true,
				detuctedInfo: { detuctedType, detuctedId },
			},
			$inc: { version: 1 },
		},
	);

	if (result.matchedCount === 0 || result.matchedCount !== receiptIds.length) throw new NotFoundError('Không tìm thấy bản ghi!');

	return result;
};

exports.lockReceipts = async (receiptIds, session) => {
	const result = await Entity.ReceiptsEntity.updateMany(
		{ _id: { $in: receiptIds }, locked: false },
		{ $set: { locked: true }, $inc: { version: 1 } },
		{ session },
	);

	if (result.matchedCount === 0 || result.matchedCount !== receiptIds.length) throw new NotFoundError('Không tìm thấy bản ghi!');
	return true;
};

exports.createReceipt = async ({
	roomObjectId,
	receiptAmount,
	payer,
	currentPeriod,

	receiptContent,
	receiptContentDetail = null,
	receiptType,
	initialStatus,
	date,
	contract = null,
	creater,
}) => {
	const receiptCode = await generatePaymentContent(process.env.PAYMENT_CONTENT_LENGTH);
	const paymentContent = await generatePaymentContent(process.env.INVOICE_CODE_LENGTH);
	const result = await Entity.ReceiptsEntity.create({
		room: roomObjectId,
		receiptContent: receiptContent,
		receiptContentDetail: receiptContentDetail,
		amount: Number(receiptAmount),
		paidAmount: 0,
		carriedOverPaidAmount: 0,
		payer: payer,
		receiptType: receiptType,
		status: initialStatus,
		isContractCreated: false,
		month: currentPeriod.currentMonth || null,
		year: currentPeriod.currentYear || null,
		locked: false,
		receiptCode,
		paymentContent,
		date: date ?? new Date(),
		contract,
		creater,
	});
	if (!result) throw new InternalError('Can not create receipt');
	return result.toObject();
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

exports.modifyReceipt = async ({ receiptObjectId, receiptVersion, receiptAmount, receiptContent, date, status }) => {
	const result = await Entity.ReceiptsEntity.findOneAndUpdate(
		{
			_id: receiptObjectId,
			version: receiptVersion,
		},
		{
			$set: {
				receiptContent: receiptContent,
				amount: Number(receiptAmount),
				status: status,
				date: date,
			},
			$inc: { version: 1 },
		},
		{
			new: true,
		},
	);

	if (!result) {
		throw new ConflictError('Hóa đơn đã bị thay đổi hoặc dữ liệu không hợp lệ');
	}

	return result.toObject();
};

exports.modifyDepositReceipt = async ({ receiptId, amount, status }) => {
	const result = await Entity.ReceiptsEntity.findOneAndUpdate({ _id: receiptId }, { $set: { amount, status } }, { new: true });
	if (!result) throw new NotFoundError('Hóa đơn đặt cọc không tồn tại');
	return result;
};

exports.updateReceiptPaidAmount = async ({ receiptId, paidAmount, receiptStatus, version }) => {
	const result = await Entity.ReceiptsEntity.updateOne(
		{
			_id: receiptId,
			version: version,
		},
		{
			$set: {
				paidAmount,
				status: receiptStatus,
			},
			$inc: { version: 1 },
		},
	);
	if (result.matchedCount === 0) throw new ConflictError('Hóa đơn đã bị thay đổi hoặc dữ liệu không hợp lệ');
};

exports.modifyDepositReceipt = async ({ receiptObjectId, receiptAmount }) => {
	const currentReceipt = await Entity.ReceiptsEntity.findOne({ _id: receiptObjectId }, { amount: 1, version: 1, paidAmount: 1 })

		.lean()
		.exec();
	if (!currentReceipt) throw new NotFoundError('Hóa đơn không tồn tại');
	if (currentReceipt.amount === receiptAmount) return currentReceipt._id;

	const receiptStatus = getInvoiceStatus(currentReceipt.paidAmount, receiptAmount);
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
	);
	console.log('result form modifyReceipts: ', result);

	if (!result) {
		throw new ConflictError('Dữ liệu này đã bị ai đó thay đổi !');
	}

	return result;
};

exports.getReceiptInfoByReceiptCode = async (receiptCode) => {
	const normalizedCode = receiptCode.toString().trim().replace(/\s+/g, '').toUpperCase();
	const [result] = await Entity.ReceiptsEntity.aggregate(Pipelines.receipts.getReceiptInfoByReceiptCode(normalizedCode));
	return result;
};

exports.unLockReceipt = async (receiptId) => {
	const result = await Entity.ReceiptsEntity.findOneAndUpdate({ _id: receiptId }, { $set: { locked: false } }, { new: true });
	if (!result) throw new NotFoundError('Hóa đơn không tồn tại');
	return result;
};

exports.unlockManyReceipts = async (receiptIds, session) => {
	console.log('log of receiptIds: ', receiptIds);
	const result = await Entity.ReceiptsEntity.updateMany({ _id: { $in: receiptIds } }, { $set: { locked: false } }, { session });
	console.log('log of result: ', result);
	if (result.matchedCount === 0 || result.matchedCount !== receiptIds.length) {
		throw new NotFoundError('Hóa đơn không tồn tại');
	}
	return 'Success';
};

exports.rollBackManyDetuctedReceipts = async (receiptIds, session) => {
	const result = await Entity.ReceiptsEntity.updateMany({ _id: { $in: receiptIds } }, { $set: { locked: false, detuctedInfo: null } }, { session });
	if (result.matchedCount === 0 || result.matchedCount !== receiptIds.length) throw new NotFoundError('Hóa đơn không tồn tại');
	return result;
};

exports.terminateReceipt = async (receiptId, version) => {
	const result = await Entity.ReceiptsEntity.updateOne(
		{ _id: receiptId, version: version },
		{
			$set: { status: receiptStatus['TERMINATED'] },
			$inc: { version: 1 },
		},
	);
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	return result;
};

exports.getNotiReceivedInfoByReceiptId = async (receiptObjectId) => {
	const [result] = await Entity.ReceiptsEntity.aggregate(Pipelines.receipts.getCashCollectorInfo(receiptObjectId));
	return result;
};

//for payment
exports.findReceiptInfoByPaymentContent = async (paymentContent, session) => {
	const normalizedPaymentContent = paymentContent.toString().trim().replace(/\s+/g, '').toUpperCase();
	const [result] = await Entity.ReceiptsEntity.aggregate(Pipelines.receipts.getReceiptByPaymentContent(normalizedPaymentContent)).session(session);
	console.log('log of result: ', result);
	if (!result) return null;
	return result;
};

exports.importReceiptsDeposit = async (receiptData) => {
	const receiptArray = await Promise.all(
		receiptData.map(async (data) => {
			const paymentContent = await generatePaymentContent(process.env.PAYMENT_CONTENT_LENGTH);
			const receiptCode = await generatePaymentContent(process.env.INVOICE_CODE_LENGTH);

			const amount = Number(data.amount);
			const paidAmount = Number(data.paidAmount);
			const carriedOverPaidAmount = Number(data.carriedOverPaidAmount);

			const receiptStatus = getInvoiceStatus(paidAmount, amount);

			return {
				room: data.room,
				amount,
				paidAmount,
				receiptType: receiptTypes['DEPOSIT'],
				status: receiptStatus,
				paymentContent,
				receiptCode,
				month: data.month,
				year: data.year,
				receiptContent: `Hóa đơn đặt cọc phòng ${data.roomIndex}`,
				carriedOverPaidAmount,
				createdAt: data.date,
				updatedAt: data.date,
				date: data.date,
				creater: data.creater,
			};
		}),
	);

	const result = await Entity.ReceiptsEntity.insertMany(receiptArray, {
		timestamps: false,
		ordered: true,
	});

	return result;
};

exports.closeAllReceipts = async (receiptIds) => {
	const result = await Entity.ReceiptsEntity.updateMany(
		{ _id: { $in: receiptIds } },
		{
			$set: { locked: true },
			$inc: { version: 1 },
		},
		{ session },
	);
	if (result.matchedCount !== receiptIds.length) throw new NotFoundError('Hóa đơn không tồn tại !');
	return true;
};

exports.updateDepositReceiptsCarriedOverPaidAmount = async (carriedOverMap) => {
	const bulkOps = [];
	for (const [receiptId, carriedOverPaidAmount] of carriedOverMap.entries()) {
		bulkOps.push({
			updateOne: {
				filter: { _id: receiptId },
				update: {
					$set: { carriedOverPaidAmount },
					$inc: { version: 1 },
				},
			},
		});
	}
	const result = await Entity.ReceiptsEntity.bulkWrite(bulkOps);
	return result;
};

exports.updateReceiptPaidStatusWithVersion = async ({ receiptId, paidAmount, version, receiptStatus }) => {
	const result = await Entity.ReceiptsEntity.updateOne(
		{
			_id: receiptId,
			version: version,
		},
		{
			$set: {
				paidAmount,
				status: receiptStatus,
			},
			$inc: { version: 1 },
		},
	);
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	return result;
};

exports.removeDetuctedInfo = async (receiptId) => {
	const result = await Entity.ReceiptsEntity.updateOne(
		{
			_id: receiptId,
		},
		{
			$set: { detuctedInfo: null },
			$inc: { version: 1 },
		},
	);
	if (result.matchedCount === 0) throw new NotFoundError('Hóa đơn không tồn tại !');
	return result;
};

exports.closeReceiptDeposit = async ({ receiptId }) => {
	const result = await Entity.ReceiptsEntity.findOneAndUpdate(
		{ _id: receiptId },
		{
			$set: { locked: true, isActive: false },
			$inc: { version: 1 },
		},
	);
	if (!result) throw new BadRequestError('Hóa đơn đặt cọc không tồn tại !');
	return result;
};

exports.updateReceiptPeriod = async ({ receiptId, month, year }) => {
	const result = await Entity.ReceiptsEntity.updateOne({ _id: receiptId }, { $set: { month, year, locked: true }, $inc: { version: 1 } });
	if (result.matchedCount === 0) throw new BadRequestError('Hóa đơn đặt cọc không tồn tại !');
};

// for depositReceipt
exports.setContractId = async ({ receiptId, status = null, contractId }) => {
	const updateQuery = !!status
		? {
				$set: { contract: contractId, status },
				$inc: { version: 1 },
		  }
		: {
				$set: { contract: contractId },
				$inc: { version: 1 },
		  };

	const result = await Entity.ReceiptsEntity.updateOne({ _id: receiptId }, updateQuery);
	if (result.matchedCount === 0) throw new BadRequestError('Không tìm thấy bản ghi!');
};

exports.addManyReceiptPayer = async (dataMap) => {
	const bulkOps = [];
	for (const [receiptId, payer] of dataMap.entries()) {
		bulkOps.push({
			updateOne: {
				filter: { _id: receiptId },
				update: {
					$set: { payer },
					$inc: { version: 1 },
				},
			},
		});
	}

	const result = await Entity.ReceiptsEntity.bulkWrite(bulkOps);
	return result;
};
