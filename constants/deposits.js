const depositStatus = {
	PENDING: 'pending', // Chờ thanh toán
	PAID: 'paid',
	PARTIAL: 'partial',
	CANCELLED: 'cancelled', // Hủy cọc, quá hạn thanh toán => ghi nhận giao dịch.
	CLOSED: 'close', // Đã làm hợp đồng.
};

module.exports = { depositStatus };
