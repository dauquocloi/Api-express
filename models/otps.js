const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { targetType, purpose } = require('../constants/otps');

const OtpsSchema = new Schema(
	{
		targetId: { type: Schema.Types.ObjectId }, // contractId
		targetType: { type: String, enum: Object.values(targetType) },
		purpose: { type: String, enum: Object.values(purpose) },
		phone: String,
		otpHash: String,
		expiredAt: Date,
		usedAt: Date,
		resendCount: { type: Number, default: 0 },
		nextResendAt: { type: Date, default: Date.now },
	},
	{ timstamps: true },
);

OtpsSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });

exports.OtpsEntity = mongoose.model('OtpsEntity', OtpsSchema, 'otps');
