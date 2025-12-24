var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const feesIndexSchema = new Schema({
	feeName: { type: String, trim: true },
	feeAmount: { type: Number },
	amount: { type: Number },
	feeKey: { type: String },
	firstIndex: { type: Number },
	lastIndex: { type: Number },
});

const DepositRefundsSchema = new Schema(
	{
		room: { type: Schema.Types.ObjectId, ref: 'rooms' },
		building: { type: Schema.Types.ObjectId, ref: 'buildings' },
		contract: { type: Schema.Types.ObjectId, ref: 'contracts' },
		// isRefundedDeposit: { type: Boolean, default: false },
		status: { type: String, enum: ['pending', 'paid', 'terminated'], default: 'pending' },
		feesIndex: [feesIndexSchema],
		feesOther: [
			{
				feeContent: { type: String },
				feeContentDetail: { type: String },
				amount: { type: Number },
			},
		],
		depositReceipt: { type: Schema.Types.ObjectId, ref: 'receipts' },
		receiptsUnpaid: { type: [Schema.Types.ObjectId], ref: 'receipts' },
		invoiceUnpaid: { type: Schema.Types.ObjectId, ref: 'invoices' },
		debts: { type: [Schema.Types.ObjectId], ref: 'debts' },
		depositRefundAmount: { type: Number, required: true },
		customerApproved: { type: Boolean, default: false },
		creator: { type: Schema.Types.ObjectId, ref: 'users' },
		image: { type: String, default: '' },
		contractOwner: { type: Schema.Types.ObjectId, ref: 'customers' },
		month: {
			type: Number,
			min: [1, 'month must be at least 1'],
			max: [12, 'month cannot exceed 12'],
			validate: {
				validator: Number.isInteger,
				message: 'month must be an integer',
			},
		},
		year: {
			type: Number,
			validate: {
				validator: Number.isInteger,
				message: 'years must be an integer',
			},
		},
		version: { type: Number, default: 1 },
	},
	{
		versionKey: false,
		timestamps: true,
	},
);

exports.DepositRefundsEntity = mongoose.model('DepositRefundsEntity', DepositRefundsSchema, 'depositRefunds');
