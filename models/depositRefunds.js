var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const feesIndexSchema = new Schema({
	feeName: { type: String, trim: true },
	feeAmount: { type: Number },
	feeKey: { type: String },
	firstIndex: { type: Number },
	lastIndex: { type: Number },
});

const DepositRefundsSchema = new Schema({
	room: { type: Schema.Types.ObjectId, ref: 'rooms' },
	feesIndex: [feesIndexSchema],
	feesOther: {
		feeContent: { type: String },
		feeContentDetail: { type: String },
		amount: { type: String },
	},
	depositRefundAmount: { type: Number },
	currentDeposit: {
		amount: { type: Number },
		receipt: { type: Schema.Types.ObjectId, ref: 'receipts' },
	},
	isRefundedDeposit: { type: Boolean, default: false },
});

exports.DepositRefundsEntity = mongoose.model('DepositRefundsEntity', DepositRefundsSchema, 'depositRefunds');
