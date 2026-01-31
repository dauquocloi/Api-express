const { date } = require('joi');
var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a Mongoose Schema
const ExpendituresSchema = new Schema(
	{
		locked: {
			type: Boolean,
			default: false,
		},
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
		},
		amount: { type: Number, min: 0 }, // Tổng tiền đã chi trong tháng
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
			ref: 'BuildingsEntity',
		},
		spender: {
			type: Schema.Types.ObjectId,
			ref: 'UsersEntity',
			required: false,
			default: null,
		},
		version: {
			type: Number,
			default: 1,
		},
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

exports.ExpendituresEntity = mongoose.model('ExpendituresEntity', ExpendituresSchema, 'expenditures');
