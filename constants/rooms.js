const roomState = {};

const ROOM_LOCK_TTL_MS = 5 * 60 * 1000;

const LOCK_REASON = {
	GET_FEES_AND_DEBTS: 'Phòng đang được cập nhật, vui lòng đợi',
};

module.exports = {
	roomState,
	ROOM_LOCK_TTL_MS,
	LOCK_REASON,
};
