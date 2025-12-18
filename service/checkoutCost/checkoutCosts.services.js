const mongoose = require('mongoose');
const Entity = require('../../models');
const getCurrentPeriod = require('../../utils/getCurrentPeriod');
const DebtsServices = require('../debts.service');
const FeesServices = require('../fees.service');
const ReceiptsServices = require('../receipts.service');
const CustomersServices = require('../customers.service');
const { formatRoomFees } = require('../../utils/formatRoomFees');
const { calculateTotalCheckoutCostAmount } = require('./checkoutCosts.helper');
const generatePaymentContent = require('../../utils/generatePaymentContent');
const Pipelines = require('../aggregates');
const { AppError, NotFoundError } = require('../../AppError');
const { errorCodes } = require('../../constants/errorCodes');

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

	return checkoutCostData;
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

module.exports = { generateCheckoutCost, getCheckoutCostDetail, getCheckoutCosts };
