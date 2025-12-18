const Entity = require('../models');

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
	return await Entity.DepositRefundsEntity.findOne({ contract: contractId }).session(session);
};

module.exports = { createDepositRefund, getDepositRefundByContractId };
