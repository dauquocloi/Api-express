const Entity = require('../../models');
const Pipelines = require('../aggregates');
const { NotFoundError, InternalError, ConflictError } = require('../../AppError');
const { checkoutCostStatus } = require('../../constants/checkoutCosts');
const generateCheckoutCost = async (
	{
		roomId,
		contractId,
		buildingId,
		creatorId,
		customerName,
		debtsAndReceiptUnpaid,
		roomFees,
		currentPeriod,
		checkoutCostReceipt,
		totalCost,
		feesOther,
		stayDays,
	},
	session,
) => {
	const checkoutCostData = {
		roomId: roomId,
		contractId: contractId,
		buildingId: buildingId,
		creatorId: creatorId,
		receiptsUnpaid: debtsAndReceiptUnpaid.receiptsUnpaid,
		invoiceUnpaid: debtsAndReceiptUnpaid.invoiceUnpaid,
		debts: debtsAndReceiptUnpaid.debts,
		fees: roomFees,
		feesOther: feesOther,
		month: currentPeriod.currentMonth,
		year: currentPeriod.currentYear,
		stayDays: stayDays,
		checkoutCostReceipt,
		customerName: customerName,
		total: totalCost,
	};

	const [newCheckoutCost] = await Entity.CheckoutCostsEntity.create([checkoutCostData], { session });
	if (!newCheckoutCost) throw new InternalError('Can not create checkout cost');
	return newCheckoutCost;
};

const getCheckoutCostDetail = async (checkoutCostObjectId) => {
	const [result] = await Entity.CheckoutCostsEntity.aggregate(Pipelines.checkoutCosts.getCheckoutCostDetailPipeline(checkoutCostObjectId));

	if (!result) throw new NotFoundError('Dữ liệu không tồn tại');
	return result;
};

const getCheckoutCosts = async (buildingId, month, year) => {
	const result = await Entity.CheckoutCostsEntity.aggregate(Pipelines.checkoutCosts.getCheckoutCostsPipeline(buildingId, month, year));
	return {
		metaData: result,
		period: {
			month,
			year,
		},
	};
};

const findById = (checkoutCostId) => {
	return Entity.CheckoutCostsEntity.findById(checkoutCostId);
};

const modifyCheckoutCost = async ({ checkoutCostId, version, fees, feesOther, newTotal }, session) => {
	const result = await Entity.CheckoutCostsEntity.updateOne(
		{ _id: checkoutCostId, version: version },
		{
			$set: {
				fees: fees,
				feesOther: feesOther,
				total: newTotal,
			},
			$inc: { version: 1 },
		},
		{
			session,
		},
	);

	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu này đã bị thay đổi !');
	return result;
};

const terminateCheckoutCost = async (checkoutCostId, version, session) => {
	const result = await Entity.CheckoutCostsEntity.updateOne(
		{ _id: checkoutCostId, version: version },
		{
			$set: { status: checkoutCostStatus['TERMINATED'] },
			$inc: { version: 1 },
		},
		{ session },
	);
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu này đã bị thay đổi !');
	return result;
};

const findByBuildingId = (buildingId, month, year) => {
	return Entity.CheckoutCostsEntity.find({ building: buildingId, month, year });
};

const updateCheckoutCostPaymentStatusByReceiptId = async (receiptId, newStatus, session) => {
	const result = await Entity.CheckoutCostsEntity.updateOne(
		{ checkoutCostReceipt: receiptId },
		{
			$set: { status: newStatus },
			$inc: { version: 1 },
		},
		{ session },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Dữ liệu phí trả phòng không tồn tại !');
	return result;
};

const findByInvoiceId = (invoiceId) => {
	return Entity.CheckoutCostsEntity.findOne({ invoiceUnpaid: invoiceId });
};

const findByReceiptUnpaidId = (receiptId) => {
	return Entity.CheckoutCostsEntity.findOne({ receiptsUnpaid: receiptId });
};

module.exports = {
	generateCheckoutCost,
	getCheckoutCostDetail,
	getCheckoutCosts,
	findById,
	modifyCheckoutCost,
	terminateCheckoutCost,
	findByBuildingId,
	updateCheckoutCostPaymentStatusByReceiptId,
	findByInvoiceId,
	findByReceiptUnpaidId,
};
