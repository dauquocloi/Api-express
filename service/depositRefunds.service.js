const { NotFoundError } = require('../AppError');
const { depositRefundStatus } = require('../constants');
const Entity = require('../models');
const Pipelines = require('./aggregates');

const findById = (depositRefundId) => Entity.DepositRefundsEntity.findById(depositRefundId);

const findByInvoiceUnpaidId = (invoiceUnpaidId) => Entity.DepositRefundsEntity.findOne({ invoiceUnpaid: invoiceUnpaidId });

const findByReceiptsUnpaid = (receiptId) => Entity.DepositRefundsEntity.findOne({ receiptsUnapid: receiptId });

const createDepositRefund = async (
	roomId,
	fees,
	feesOther,
	depositRefundAmount,
	invoiceUnpaid,
	buildingId,
	contractId,
	depositReceiptId,
	contractOwnerId,
	debtIds,
	receiptIds,
	currentPeriod,
	creatorId,
	session,
) => {
	const [newDepositRefund] = await Entity.DepositRefundsEntity.create(
		[
			{
				room: roomId,
				feesIndex: fees,
				feesOther: feesOther,
				depositRefundAmount: Number(depositRefundAmount),
				invoiceUnpaid: invoiceUnpaid ?? null,
				receiptsUnpaid: receiptIds ?? null,
				isRefundedDeposited: false,
				customerApproved: false,
				creator: creatorId,
				building: buildingId,
				contract: contractId,
				depositReceipt: depositReceiptId,
				contractOwner: contractOwnerId,
				month: currentPeriod.currentMonth,
				year: currentPeriod.currentYear,
				debts: debtIds,
			},
		],
		{ session },
	);
	newDepositRefund.toObject();

	return newDepositRefund;
};

const getDepositRefundByContractId = async (contractId, session) => {
	return await Entity.DepositRefundsEntity.findOne({
		contract: contractId,
		status: { $in: [depositRefundStatus['PAID'], depositRefundStatus['PENDING']] },
	}).session(session);
};

const findByBuildingId = (buildingId, month, year) => {
	return Entity.DepositRefundsEntity.find({ building: buildingId, month, year });
};

const updateDepositRefundStatusByReceiptId = async (receiptId, status, session) => {
	const result = await Entity.DepositRefundsEntity.updateOne(
		{ depositReceipt: receiptId },
		{
			$set: { status: status },
			$inc: { version: 1 },
		},
		{ new: true, session },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Dữ liệu phiếu cọc không tồn tại!');
	return result;
};

const getDepositRefunds = async (buildingId, mode, session) => {
	let result = [];
	if (mode === depositRefundStatus['PENDING']) {
		result = await Entity.DepositRefundsEntity.aggregate(Pipelines.depositRefunds.getDepositRefunds(buildingId, mode), { session });
	} else {
		result = await Entity.DepositRefundsEntity.aggregate(Pipelines.depositRefunds.getDepositRefundsModeRefundedPipeline(buildingId), { session });
	}
	return result;
};

module.exports = {
	createDepositRefund,
	getDepositRefundByContractId,
	findById,
	findByBuildingId,
	updateDepositRefundStatusByReceiptId,
	findByInvoiceUnpaidId,
	findByReceiptsUnpaid,
};
