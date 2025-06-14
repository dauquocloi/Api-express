var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a Mongoose Schema
const IncidentalRevenuesSchema = new Schema({
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
	amount: { type: Number, default: 0, required: true }, // Tổng tiền thu được trong tháng
	content: {
		type: String,
		required: true,
		trim: true,
	},
	date: {
		type: Date,
		default: () => Date.now(),
	},
	image: {
		type: String,
		trim: true,
	},
	building: {
		type: Schema.Types.ObjectId,
		ref: 'buildings',
		required: true,
	},
	collector: {
		type: Schema.Types.ObjectId,
		ref: 'users',
	},
});

exports.IncidentalRevenuesEntity = mongoose.model('IncidentalRevenuesEntity', IncidentalRevenuesSchema, 'incidentalRevenues');
