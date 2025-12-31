const transfromBillStatus = {
	paid: 'Đã thanh toán',
	unpaid: 'Chưa thanh toán',
	partial: 'Còn thiếu',
	terminated: 'Đã hủy',
	cancelled: 'Đã hủy',
	deleted: 'Đã xóa',
};

const billType = {
	RECEIPT: 'receipt',
	INVOICE: 'invoice',
};

module.exports = { transfromBillStatus, billType };
