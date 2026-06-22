const Services = require('../../service');

const handleLockInvoiceJob = async (payload) => {
	const { invoiceId } = payload;
	const invoice = await Services.invoices.findById(invoiceId).lean().exec();
	if (!invoice || invoice.locked === true) return { success: true };
	await Services.invoices.lockInvoice(invoiceId);

	return {
		success: true,
	};
};

module.exports = { handleLockInvoiceJob };
