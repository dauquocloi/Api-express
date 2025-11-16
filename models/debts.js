var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DebtsSchema = new Schema(
	{
		content: String,
		amount: {
			type: Number,
			default: 0,
			required: true,
		},
		room: {
			type: Schema.Types.ObjectId,
			ref: 'rooms',
		},
		period: {
			month: { type: Number },
			year: { type: Number },
		},

		status: {
			type: String,
			// pending: "Sau khi chốt sổ", terminated: "Đã xóa",
			// closed: "Đã được gắn vào hóa đơn tiền nhà"
			enum: ['pending', 'closed', 'terminated'],
			default: 'pending',
		},
		sourceType: {
			type: String,
			enum: ['invoice', 'receipt', 'pending'],
			default: 'pending',
		},
		sourceId: {
			type: Schema.Types.ObjectId,
			default: null,
		},
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true,
	},
);

exports.DebtsEntity = mongoose.model('DebtsEntity', DebtsSchema, 'debts');
