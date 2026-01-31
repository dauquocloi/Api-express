const Entity = require('../models');

exports.generateOtp = async ({ targetId, targetType, purpose, phone, otpHash }) => {
	const result = await Entity.OtpsEntity.create({
		targetId,
		targetType,
		purpose,
		phone,
		otpHash,
		expiredAt: Date.now() + 5 * 60 * 1000,
	});
	return result.toObject();
};

exports.findByTargetId = (targetId) => Entity.OtpsEntity.findOne({ targetId });
