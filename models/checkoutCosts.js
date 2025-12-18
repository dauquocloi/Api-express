var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const feesSchema = new Schema({
	feeName: { type: String, trim: true },
	feeAmount: { type: Number },
	amount: { type: Number },
	feeKey: { type: String },
	unit: { type: String },
	quantity: { type: Number },
	firstIndex: { type: Number },
	lastIndex: { type: Number },
});

const CheckoutCostsSchema = new Schema(
	{
		contractId: { type: Schema.Types.ObjectId, ref: 'contracts' },
		roomId: { type: Schema.Types.ObjectId, ref: 'rooms' },
		buildingId: { type: Schema.Types.ObjectId, ref: 'buildings' },
		receiptsUnpaid: { type: [Schema.Types.ObjectId], ref: 'receipts' },
		invoiceUnpaid: { type: Schema.Types.ObjectId, ref: 'invoices' },
		creatorId: { type: Schema.Types.ObjectId, ref: 'users' },
		customerName: { type: String, trim: true },
		debts: { type: [Schema.Types.ObjectId], ref: 'debts' },
		status: { type: String, enum: ['pending', 'paid', 'terminated'], default: 'pending' },
		fees: [feesSchema],
		stayDays: { type: Number },
		checkoutCostReceipt: { type: Schema.Types.ObjectId, ref: 'receipts' },
		feesOther: [
			{
				feeContent: { type: String },
				feeContentDetail: { type: String },
				amount: { type: Number },
			},
		],
		month: {
			type: Number,
			min: [1, 'month must be at least 1'],
			max: [12, 'month cannot exceed 12'],
			validate: {
				validator: Number.isInteger,
				message: 'month must be an integer',
			},
			required: true,
		},
		year: {
			type: Number,
			validate: {
				validator: Number.isInteger,
				message: 'years must be an integer',
			},
			required: true,
		},
		total: { type: Number, required: true },
	},
	{ timestamps: true },
);

exports.CheckoutCostsEntity = mongoose.model('CheckoutCostsEntity', CheckoutCostsSchema, 'checkoutCosts');
