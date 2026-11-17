const { receiptStatus } = require('./receipt');

const depositStatus = {
	PENDING: 'pending', // Chờ tạo hóa đơn thanh toán.
	PAID: 'paid',
	PARTIAL: 'partial',
	CANCELLED: 'cancelled', // Hủy cọc, quá hạn thanh toán => ghi nhận giao dịch.
	CLOSED: 'close', // Đã làm hợp đồng.
	WAITING_PAYMENT: 'waitingPayment', // Đã tạo hóa đơn thanh toán => chờ thanh toán.
	TERMINATED: 'terminated', // Xóa hóa đơn thanh toán, khách không thanh toán cọc.
};

const depositRefundStatus = {
	PENDING: 'pending', // Chờ thanh toán
	PAID: 'paid',
	TERMINATED: 'terminated',
};

const receiptToDepositRefundStatusMap = {
	unpaid: 'pending',
	paid: 'paid',
	partial: 'partial',
	terminated: 'terminated',
};

const receiptToDepositStatus = {
	[receiptStatus['PENDING']]: depositStatus['PENDING'],
	[receiptStatus['UNPAID']]: depositStatus['PENDING'],
	[receiptStatus['PAID']]: depositStatus['PAID'],
	[receiptStatus['PARTIAL']]: depositStatus['PARTIAL'],
	[receiptStatus['CANCELLED']]: depositStatus['CANCELLED'],
};

const depositTrackingStatus = {
	NOT_CREATED: 'notCreated',
	ACTIVE: 'active',
	CANCELLED: 'cancelled',
};

const previewDepositPdfExp = 30 * 60 * 1000;

const DEPOSIT_DOCUMENT_FIELDS = Object.freeze({
	CREATED_DATE: 'CREATED_DATE',
	PARTY_B: 'PARTY_B',
	CUSTOMER_FIELDS: Object.freeze({
		FULLNAME: 'FULLNAME',
		DOB: 'DOB',
		ADDRESS: 'ADDRESS',
		CCCD: 'CCCD',
		CCCD_DATE: 'CCCD_DATE',
		CCCD_AT: 'CCCD_AT',
		PHONE: 'PHONE',
	}),
	ROOM_INDEX: 'ROOM_INDEX',
	RENT: 'RENT',
	TERM: 'TERM',
	CHECKIN_DATE: 'CHECKIN_DATE',
	DEPOSIT_AMOUNT: 'DEPOSIT_AMOUNT',
	DEPOSIT_AMOUNT_WORDS: 'DEPOSIT_AMOUNT_WORDS',
	CONTRACT_SIGN_DATE: 'CONTRACT_SIGN_DATE',
	CONTRACT_END_DATE: 'CONTRACT_END_DATE',

	FEES: 'FEES',
	FEE_FIELDS: Object.freeze({
		NAME: 'NAME',
		AMOUNT: 'AMOUNT',
		TYPE: 'TYPE',
	}),

	INTERIORS: 'INTERIORS',
	INTERIOR_FIELDS: Object.freeze({
		NAME: 'NAME',
		QUANT: 'QUANT',
	}),
	NOTE: 'NOTE',
});

module.exports = {
	depositStatus,
	depositRefundStatus,
	receiptToDepositRefundStatusMap,
	receiptToDepositStatus,
	depositTrackingStatus,
	previewDepositPdfExp,
	DEPOSIT_DOCUMENT_FIELDS,
};
