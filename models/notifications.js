var mongoose = require('mongoose');
const Entity = require('./index');
const Schema = mongoose.Schema;

const NotificationsSchema = new Schema(
	{
		type: { type: String, required: true, enum: ['transaction', 'task', 'contractExpire', 'collectCash'] },
		content: { type: String, required: true, trim: true },
		title: { type: String, required: true },
		metaData: {
			type: Object, // invoiceId, receiptId, roomId, tastId, depositId, depositRefundId.
			default: {},
		},
		isRead: { type: Boolean, default: false },
		receivers: [{ type: Schema.Types.ObjectId, ref: 'users', required: true }],
	},
	{
		timestamps: true,
	},
);

exports.NotificationsEntity = mongoose.model('NotificationsEnitty', NotificationsSchema, 'notifications');
