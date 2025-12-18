const debtStatus = {
	PENDING: 'pending', // sau khi chốt sổ  => nợ được tạo và chờ trạng thái tiếp theo //
	CLOSED: 'closed', // Nợ đã được chuyển sang trạng thái tiếp theo // HÓA ĐƠN TIỀN NHÀ || HÓA ĐƠN THU TIỀN //
	TERMINATED: 'terminated', // Khoản nợ đã bị xóa //
};

// Loại hóa đơn hiện tại đang dữ khoản nợ.
const sourceType = {
	INVOICE: 'invoice', // Hóa đơn tiền nhà //
	RECEIPT: 'receipt', // Hóa đơn thu tiền //
	PENDING: 'pending', // Chưa thêm vào hóa đơn nào //
};

module.exports = { debtStatus, sourceType };
