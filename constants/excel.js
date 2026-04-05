const Schema = [
	{ key: 'room', header: 'Phòng', type: 'text', width: 15 },
	{ key: 'depositAmount', header: 'Tiền cọc', type: 'number', width: 15 },
	{ key: 'depositPaidAmount', header: 'Đã đóng', type: 'number', width: 15 },
	{ key: 'rent', header: 'Tiền thuê', type: 'number', width: 15 },
	{ key: 'roomState', header: 'Trạng thái', type: 'text', width: 18 },
	{ key: 'customerName', header: 'Tên KH', type: 'text', width: 28 },
	{ key: 'customerPhone', header: 'SĐT', type: 'text', width: 15 },
	{ key: 'numberOfTenants', header: 'Số người', type: 'number', width: 15 },
	{ key: 'numberOfVehicles', header: 'Số xe', type: 'number', width: 15 },
	{ key: 'totalIncome', header: 'Tổng thu', type: 'number', width: 15 },
];

const FormatType = {
	number: '#,##0',
	money: '#,##0 "đ"',
	percent: '0%',
};

module.exports = { Schema, FormatType };
