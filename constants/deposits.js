const depositStatus = {
	PENDING: 'pending', // Chờ thanh toán
	PAID: 'paid',
	PARTIAL: 'partial',
	CANCELLED: 'cancelled', // Hủy cọc, quá hạn thanh toán => ghi nhận giao dịch.
	CLOSED: 'close', // Đã làm hợp đồng.
};

const depositRefundStatus = {
	PENDING: 'pending', // Chờ thanh toán
	PAID: 'paid',
	TERMINATED: 'terminated',
};

module.exports = { depositStatus, depositRefundStatus };
