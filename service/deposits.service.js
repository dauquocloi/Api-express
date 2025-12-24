const Enitty = require('../models');
const { depositStatus } = require('../constants/deposits');

exports.findDepositByRoomId = async (roomId, session) => {
	const query = Enitty.DepositsEntity.findOne({
		room: roomId,
		status: { $nin: [depositStatus['CLOSED'], depositStatus['CANCELLED'], depositStatus['PENDING']] },
	});
	if (session) query.session(session);
	const result = await query.lean().exec();
	return result;
};
