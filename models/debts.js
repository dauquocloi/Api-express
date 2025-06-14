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
		status: {
			type: String,
			enum: ['pending', 'paid'],
			default: 'pending',
		}, // Trạng thái nợ
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

exports.DebtsEntity = mongoose.model('DebtsEntity', DebtsSchema, 'debts');
