const Services = require('../../service');
const { invoiceStatus } = require('../../constants/invoices');
const { receiptStatus } = require('../../constants/receipt');
const { NoDataError, NotFoundError } = require('../../AppError');

exports.getInvoiceInfoByInvoiceCode = async (billCode) => {
	const invoiceInfo = await Services.invoices.getInvoiceInfoByInvoiceCode(billCode);
	if (invoiceInfo) {
		if (invoiceInfo.status === invoiceStatus['CANCELLED']) {
			throw new NoDataError(`Hóa đơn ${billCode} đã bị hủy`);
		}
		return { ...invoiceInfo, type: 'invoice' };
	}

	const receiptInfo = await Services.receipts.getReceiptInfoByReceiptCode(billCode);

	if (receiptInfo) {
		if (receiptInfo.status !== receiptStatus['CANCELLED'] || receiptInfo.status !== receiptStatus['TERMINATED']) {
			return { ...receiptInfo, type: 'receipt' };
		} else throw new NoDataError(`Hóa đơn ${billCode} đã bị hủy`);
	}

	throw new NotFoundError(`Hóa đơn ${billCode} không tồn tại`);
};
