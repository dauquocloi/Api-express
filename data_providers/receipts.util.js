const Services = require('../service');
const { NotFoundError } = require('../AppError');
const { calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { DETUCTED_TYPE, receiptStatus } = require('../constants');

exports.updateDetuctedInfo = async ({ receiptInfo, newReceiptStatus, transactionAmount }) => {
	const receiptUnpaidAmount = calculateInvoiceUnpaidAmount(transactionAmount, receiptInfo.paidAmount);
	console.log('receiptUnpaidAmount', receiptUnpaidAmount);
	const appliedAmount = Math.min(transactionAmount, receiptUnpaidAmount);
	console.log('appliedAmount', appliedAmount);

	const { detuctedType } = receiptInfo.detuctedInfo;
	if (detuctedType === DETUCTED_TYPE['DEPOSIT_REFUND']) {
		const depositRefundInfo = await Services.depositRefunds.findByReceiptsUnpaid(receiptInfo._id);
		if (!depositRefundInfo) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');

		depositRefundInfo.depositRefundAmount += appliedAmount;
		if (newReceiptStatus === receiptStatus['PAID']) {
			depositRefundInfo.receiptsUnpaid = depositRefundInfo.receiptsUnpaid.filter(
				(receipt) => receipt.toString() !== receiptInfo._id.toString(),
			);
			await Services.receipts.removeDetuctedInfo(receiptInfo._id);
		}
		depositRefundInfo.version += 1;
		await depositRefundInfo.save();
		console.log('depositRefundInfo', depositRefundInfo);
	}

	if (detuctedType === DETUCTED_TYPE['TERMINATE_CONTRACT_EARLY']) {
		const checkoutCost = await Services.checkoutCosts.findByReceiptUnpaidId(receiptInfo._id);
		if (!checkoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại');
		console.log('log of currentCheckoutCost: ', checkoutCost);

		checkoutCost.total -= appliedAmount;
		if (newReceiptStatus === receiptStatus['PAID']) {
			checkoutCost.receiptsUnpaid = checkoutCost.receiptsUnpaid.filter((receipt) => receipt.toString() !== receiptInfo._id.toString());
			await Services.receipts.removeDetuctedInfo(receiptInfo._id);
		}
		checkoutCost.version += 1;
		await checkoutCost.save();
		console.log('checkoutCost', checkoutCost);
	}
};
