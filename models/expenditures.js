const { date } = require('joi');
var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a Mongoose Schema
const ExpendituresSchema = new Schema(
	{
		month: {
			type: Number,
			required: true,
			min: [1, 'month must be at least 1'],
			max: [12, 'month cannot exceed 30'],
			validate: {
				validator: Number.isInteger,
				message: 'month must be an integer',
			},
		}, // Tháng (1 - 12)
		year: {
			type: Number,
			required: true,
			validate: {
				validator: Number.isInteger,
				message: 'years must be an integer',
			},
		}, // Năm
		content: {
			type: String,
			required: true,
			maxLength: 200,
		},
		amount: { type: Number, min: 0, default: 0 }, // Tổng tiền đã chi trong tháng
		type: {
			type: String,
			enum: ['periodic', 'incidental'],
			required: true,
		},
		date: {
			type: Date,
			default: () => Date.now(),
		},
		building: {
			type: Schema.Types.ObjectId,
			ref: 'buildings',
		},
		spender: {
			type: Schema.Types.ObjectId,
			ref: 'users',
			required: false,
			default: null,
		},
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

exports.ExpendituresEntity = mongoose.model('ExpendituresEntity', ExpendituresSchema, 'expenditures');
