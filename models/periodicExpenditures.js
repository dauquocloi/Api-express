var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a Mongoose Schema
const PeriodicExpendituresSchema = new Schema(
	{
		content: {
			type: String,
			maxLength: 300,
			required: true,
		},
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		building: {
			type: Schema.Types.ObjectId,
			ref: 'buildings',
		},
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

exports.PeriodicExpendituresEntity = mongoose.model('PeriodicExpendituresEntity', PeriodicExpendituresSchema, 'periodicExpenditures');
