const invoiceStatus = {
	UNPAID: 'unpaid',
	PAID: 'paid',
	PARTIAL: 'partial',
	CANCELLED: 'cancelled', // đã đóng : không nhận thu tiền : vẫn nhận doanh thu (Nên dành cho đã tạo hđ nhưng khách bỏ cọc !)
	TERMINATED: 'terminated', // đã xóa: không ghi nhận doanh thu
	PENDING: 'pending', // đang tạo hợp động : chờ thanh toán tại thời điểm
};

const invoiceType = {
	RENTAL: 'rental',
	FIRST_INVOICE: 'firstInvoice',
};

const transformInvoiceStatus = {
	[invoiceStatus.UNPAID]: 'Chưa thanh toán',
	[invoiceStatus.PAID]: 'Đã thanh toán',
	[invoiceStatus.PARTIAL]: 'Thanh toán một phần',
	[invoiceStatus.CANCELLED]: 'Hóa đơn hóa',
	[invoiceStatus.TERMINATED]: 'Hóa đơn hóa',
	[invoiceStatus.PENDING]: 'Hóa đơn hóa',
};

module.exports = { invoiceStatus, invoiceType, transformInvoiceStatus };
