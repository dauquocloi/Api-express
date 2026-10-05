const { NotFoundError, ConflictError } = require('../AppError');
const { depositRefundStatus } = require('../constants');
const Entity = require('../models');
const Pipelines = require('./aggregates');

const findById = (depositRefundId) => Entity.DepositRefundsEntity.findById(depositRefundId);

const findByInvoiceUnpaidId = (invoiceUnpaidId) => Entity.DepositRefundsEntity.findOne({ invoiceUnpaid: invoiceUnpaidId });

const findByReceiptsUnpaid = (receiptId) => Entity.DepositRefundsEntity.findOne({ receiptsUnapid: receiptId });

const createDepositRefund = async ({
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
	stayDays,
}) => {
	const newDepositRefund = await Entity.DepositRefundsEntity.create({
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
		stayDays,
	});
	newDepositRefund.toObject();

	return newDepositRefund;
};

const getDepositRefundByContractId = async (contractId) => {
	return await Entity.DepositRefundsEntity.findOne({
		contract: contractId,
		status: { $in: [depositRefundStatus['PAID'], depositRefundStatus['PENDING']] },
	});
};

const findByBuildingId = (buildingId, month, year) => {
	return Entity.DepositRefundsEntity.find({ building: buildingId, month, year });
};

const getDepositRefunds = async (buildingId, mode) => {
	let result = [];
	if (mode === depositRefundStatus['PENDING']) {
		result = await Entity.DepositRefundsEntity.aggregate(Pipelines.depositRefunds.getDepositRefundsModePendingPipeline(buildingId, mode));
	} else {
		result = await Entity.DepositRefundsEntity.aggregate(Pipelines.depositRefunds.getDepositRefundsModeRefundedPipeline(buildingId));
	}
	return result;
};

const confirmDepositRefund = async ({ depositRefundId, version, month, year, status, image }) => {
	const result = await Entity.DepositRefundsEntity.findOneAndUpdate(
		{
			_id: depositRefundId,
			version,
		},
		{
			$set: {
				month,
				year,
				status,
				image: image ?? null,
			},
			$inc: { version: 1 },
		},
		{
			new: true,
		},
	);

	if (!result) throw new ConflictError('Dữ liệu đã bị thay đổi, vui lòng tải lại trang !');
	return result;
};

const modifyDepositRefund = async (data) => {
	const { depositRefundId, feesOther = [], feesIndex, stayDays, debtIds, newDepositRefundAmount, version, creator } = data;
	const result = await Entity.DepositRefundsEntity.findOneAndUpdate(
		{
			_id: depositRefundId,
			version,
		},
		{
			$set: {
				feesOther,
				feesIndex,
				stayDays,
				debts: debtIds,
				depositRefundAmount: newDepositRefundAmount,
				creator,
			},
			$inc: { version: 1 },
		},
		{
			new: true,
		},
	);
	if (!result) throw new ConflictError('Dữ liệu hoàn cọc đã bị thay đổi, vui lòng tải lại trang !');
	return result;
};

const getDepositRefundDetail = async (depositRefundId) => {
	const [result] = await Entity.DepositRefundsEntity.aggregate(Pipelines.depositRefunds.getDepositRefundDetailPipeline(depositRefundId));
	if (!result) throw new NotFoundError('Không có dữ liệu');
	return result;
};

module.exports = {
	createDepositRefund,
	getDepositRefundByContractId,
	findById,
	findByBuildingId,
	findByInvoiceUnpaidId,
	findByReceiptsUnpaid,
	getDepositRefunds,
	confirmDepositRefund,
	modifyDepositRefund,
	getDepositRefundDetail,
};
