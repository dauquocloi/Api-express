var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const feesIndexSchema = new Schema({
	feeName: { type: String, trim: true },
	feeAmount: { type: Number },
	feeKey: { type: String },
	firstIndex: { type: Number },
	lastIndex: { type: Number },
});

const DepositRefundsSchema = new Schema(
	{
		room: { type: Schema.Types.ObjectId, ref: 'rooms' },
		building: { type: Schema.Types.ObjectId, ref: 'buildings' },
		contract: { type: Schema.Types.ObjectId, ref: 'contracts' },
		isRefundedDeposit: { type: Boolean, default: false },
		feesIndex: [feesIndexSchema],
		feesOther: [
			{
				feeContent: { type: String },
				feeContentDetail: { type: String },
				amount: { type: Number },
			},
		],
		depositRefundAmount: { type: Number },

		customerApproved: { type: Boolean, default: false },
		creator: { type: Schema.Types.ObjectId, ref: 'users' },
		image: { type: String, default: '' },
		depositReceipt: { type: Schema.Types.ObjectId, ref: 'receipts' },
		contractOwner: { type: Schema.Types.ObjectId, ref: 'customers' },
	},
	{
		timestamps: true,
	},
);

exports.DepositRefundsEntity = mongoose.model('DepositRefundsEntity', DepositRefundsSchema, 'depositRefunds');
