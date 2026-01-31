const receiptTypes = {
	DEPOSIT: 'deposit',
	INCIDENTAL: 'incidental',
	DEBTS: 'debts',
	CHECKOUT: 'checkout',
};

const receiptStatus = {
	PAID: 'paid', // Số tiền thanh toán >= số tiền phải thanh toán.
	UNPAID: 'unpaid', // Số tiền thanh toán === 0
	PARTIAL: 'partial', // 0 < Số tiền thanh toán  < Số tiền phải thanh toán
	PENDING: 'pending', // Chờ thanh toán (đặt cọc, hợp đồng). Ko ghi nhận hóa đơn.
	CANCELLED: 'cancelled', // "Hủy => ko ghi nhận thu nữa, ghi nhận giao dịch" (dành riêng cho deposit)
	DELETED: 'deleted', // Xóa ko ghi nhận giao dịch (not used)
	TERMINATED: 'terminated', // Xóa hoàn toàn khỏi hệ thống (không ghi nhận thu,ko ghi nhận giao dịch)
};

module.exports = { receiptTypes, receiptStatus };
