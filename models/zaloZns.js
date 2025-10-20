const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const zaloZnsSchema = new Schema(
	{
		trackingId: { type: String, required: true, trim: true },
		sender: { type: Schema.Types.ObjectId, ref: 'users' },
		sentAt: { type: Date },
		templateId: { type: String, required: true, trim: true },
		toPhone: { type: String },
		status: { type: String, default: 'pending', enum: ['pending', 'fulfilled', 'rejected'] },
		sendingMode: { type: String, enum: ['1', '2'] },
	},
	{
		timestamps: true,
	},
);

exports.ZaloZnsEntity = mongoose.model('ZaloZnsEntity', zaloZnsSchema, 'zaloZns');
