const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SepaysSchema = new Schema(
	{
		// 🔐 API KEY (HASHED)
		key: {
			type: String,
			required: true,
			index: true,
		},

		provider: {
			type: String,
			default: 'sepay',
			immutable: true,
		},

		// 🏢 Gắn với ai
		owner: {
			type: Schema.Types.ObjectId,
			ref: 'Users',
			required: true,
		},

		// 🚦 Trạng thái tích hợp
		active: {
			type: Boolean,
			default: true,
		},

		// Health / Failure tracking
		stats: {
			totalWebhook: { type: Number, default: 0 },
			successWebhook: { type: Number, default: 0 },
			failedWebhook: { type: Number, default: 0 },

			lastSuccessAt: Date,
			lastFailureAt: Date,
			lastFailureReason: String,
		},

		lastWebhookAt: Date,
	},
	{ timestamps: true },
);

exports.SepaysEntity = mongoose.model('SepaysEntity', SepaysSchema, 'sepays');
