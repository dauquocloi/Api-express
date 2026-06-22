const Services = require('../../service');

const handleLockReceiptJob = async (payload) => {
	const { receiptIds } = payload;
	const receipts = await Services.receipts.findReceipts(receiptIds).lean().exec();
	if (receipts?.length === 0) return { success: true };
	await Services.receipts.lockReceipts(receiptIds);

	return {
		success: true,
	};
};

module.exports = {
	handleLockReceipt,
};
