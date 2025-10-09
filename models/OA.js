const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OATokenSchema = new Schema(
	{
		provider: { type: String, default: 'zalo' }, //sepay, zalo, gg, gmail
		oaId: String,
		accessToken: String,
		refreshToken: String,
		expiresIn: Number, // thời gian hết hạn (giây)
		obtainedAt: { type: Date, default: Date.now },
	},
	{
		timestamps: true,
	},
);

exports.OATokensEntity = mongoose.model('OATokensEntity', OATokenSchema, 'OATokens');
