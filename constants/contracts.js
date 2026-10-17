const contractStatus = {
	ACTIVE: 'active',
	EXPIRED: 'expired', //Hết hạn: Thời hạn HĐ đã hết.
	TERMINATED: 'terminated', // Hủy hợp đồng: Chấm dứt hợp đồng trước thời hạn.
	CANCELLED: 'cancelled', //Đóng: bị sửa đổi hoặc không còn đúng.
	SUSPENDED: 'suspended', //Đóng: bị sửa đổi hoặc bị thay thế.
	PENDING: 'pending', //Chờ khách xác nhận.
};

const CUSTOMER_FORM = Object.freeze({
	FULLNAME: 'FULLNAME',
	DOB: 'DOB',
	ADDRESS: 'ADDRESS',
	CCCD: 'CCCD',
	CCCD_DATE: 'CCCD_DATE',
	CCCD_AT: 'CCCD_AT',
	PHONE: 'PHONE',
});

const CONTRACT_DOCUMENT_FIELDS = Object.freeze({
	CREATED_DATE: 'CREATED_DATE',
	ROOM_INDEX: 'ROOM_INDEX',

	PARTY_A: CUSTOMER_FORM,

	FEES: Object.freeze({
		NAME: 'NAME',
		AMOUNT: 'AMOUNT',
		TYPE: 'TYPE',
	}),
	INTERIORS: Object.freeze({
		NAME: 'NAME',
		QUANT: 'QUANT',
	}),
	DEPOSIT: 'DEPOSIT',
	SIGN_DATE: 'SIGN_DATE',
	END_DATE: 'END_DATE',
	CONTRACT_TERM: 'CONTRACT_TERM',
	ROOM_PRICE: 'ROOM_PRICE',
	ROOM_MATES: CUSTOMER_FORM,
	NOTE: 'NOTE',
});

const getDebtsReceiptsUnpaidUsedFor = {
	TERMINATE_CONTRACT_EARLY: 'terminateContractEarly',
	DEPOSIT_REFUND: 'depositRefund',
};

const previewContractPdfExp = 30 * 60 * 1000;

module.exports = { contractStatus, CONTRACT_DOCUMENT_FIELDS, getDebtsReceiptsUnpaidUsedFor, previewContractPdfExp };
