const Services = require('../service');
const { calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { DETUCTED_TYPE, invoiceStatus } = require('../constants');
const { NotFoundError } = require('../AppError');

exports.updateDetuctedInvoice = async ({ invoiceInfo, newInvoiceStatus, transactionAmount }) => {
	const unpaidAmount = calculateInvoiceUnpaidAmount(invoiceInfo.total, invoiceInfo.paidAmount);
	const appliedAmount = Math.min(transactionAmount, unpaidAmount);

	const { detuctedType } = invoiceInfo.detuctedInfo;
	if (detuctedType === DETUCTED_TYPE['DEPOSIT_REFUND']) {
		const depositRefundInfo = await Services.depositRefunds.findByInvoiceUnpaidId(invoiceInfo._id);
		if (!depositRefundInfo) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');

		depositRefundInfo.depositRefundAmount += appliedAmount;
		if (newInvoiceStatus === invoiceStatus['PAID']) {
			depositRefundInfo.invoiceUnpaid = null;
			await Services.invoices.removeDetuctedInfo(invoiceInfo._id);
		}
		depositRefundInfo.version += 1;
		await depositRefundInfo.save();
		console.log('depositRefundInfo', depositRefundInfo);
	}

	if (detuctedType === DETUCTED_TYPE['TERMINATE_CONTRACT_EARLY']) {
		const checkoutCost = await Services.checkoutCosts.findByInvoiceId(invoiceInfo._id);
		if (!checkoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại');

		checkoutCost.total -= appliedAmount;
		if (newInvoiceStatus === invoiceStatus['PAID']) {
			checkoutCost.invoicesUnpaid = null;
			await Services.invoices.removeDetuctedInfo(invoiceInfo._id);
		}
		checkoutCost.version += 1;
		await checkoutCost.save();
		console.log('checkoutCost', checkoutCost);
	}
};
