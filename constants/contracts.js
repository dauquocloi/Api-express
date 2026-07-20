const contractStatus = {
	ACTIVE: 'active',
	EXPIRED: 'expired', //Hết hạn: Thời hạn HĐ đã hết
	TERMINATED: 'terminated', // Hủy hợp đồng: Bỏ cọc.
	CANCELLED: 'cancelled', //Đóng: bị sửa đổi hoặc không còn đúng.
	PENDING: 'pending',
};

const CONTRACT_DOCUMENT_FORM = {
	CREATED_DATE: 'CREATED_DATE',
	PARTY_A: {
		FULLNAME: 'FULLNAME',
		DOB: 'DOB',
		ADDRESS: 'ADDRESS',
		CCCD: 'CCCD',
		CCCD_DATE: 'CCCD_DATE',
		CCCD_AT: 'CCCD_AT',
		PHONE: 'PHONE',
	},
	FEES: 'FEES',
	INTERIORS: 'INTERIORS',
	DEPOSIT: 'DEPOSIT',
	SIGN_DATE: 'SIGN_DATE',
	END_DATE: 'END_DATE',
	CONTRACT_TERM: 'CONTRACT_TERM',
	ROOM_PRICE: 'ROOM_PRICE',
};

module.exports = { contractStatus, CONTRACT_DOCUMENT_FORM };
