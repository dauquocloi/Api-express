const invoiceStatus = {
	UNPAID: 'unpaid',
	PAID: 'paid',
	PARTIAL: 'partial',
	CANCELLED: 'cancelled', // đã đóng : không nhận thu tiền : vẫn nhận doanh thu (Nên dành cho đã tạo hđ nhưng khách bỏ cọc !)
	TERMINATED: 'terminated', // đã xóa: không ghi nhận doanh thu
	PENDING: 'pending', // đang tạo hợp động : chờ thanh toán tại thời điểm
};

module.exports = { invoiceStatus };
