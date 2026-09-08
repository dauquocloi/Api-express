var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a Mongoose Schema
const RevenuesSchema = new Schema(
	{
		building: {
			type: Schema.Types.ObjectId,
			ref: 'BuildingsEntity',
		},
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
		amount: { type: Number, default: 0 }, // Tổng tiền thu được trong tháng
		actualPaidAmount: { type: Number, default: 0 }, // Tổng tiền thực thu được trong tháng
		//invoices
		periodicInvoices: [
			{
				feeName: { type: String, required: true },
				totalAmount: { type: Number, required: true },
			},
		],
		//receipts
		incidentalRevenues: {
			type: [Schema.Types.ObjectId],
			ref: 'ReceiptsEntity',
		},

		//incidentalRevenues
		otherRevenues: {
			type: [Schema.Types.ObjectId],
			ref: 'IncidentalRevenuesEntity',
		},
	},
	{
		timestamps: true,
	},
);

exports.RevenuesEntity = mongoose.model('RevenuesEntity', RevenuesSchema, 'revenues');
