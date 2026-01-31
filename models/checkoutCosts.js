var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { checkoutCostStatus } = require('../constants/checkoutCosts');

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
		contractId: { type: Schema.Types.ObjectId, ref: 'ContractsEntity' },
		roomId: { type: Schema.Types.ObjectId, ref: 'RoomsEntity' },
		buildingId: { type: Schema.Types.ObjectId, ref: 'BuildingsEntity' },
		receiptsUnpaid: { type: [Schema.Types.ObjectId], ref: 'ReceiptsEntity' },
		invoiceUnpaid: { type: Schema.Types.ObjectId, ref: 'InvoicesEntity' },
		creatorId: { type: Schema.Types.ObjectId, ref: 'UsersEntity' },
		customerName: { type: String, trim: true },
		debts: { type: [Schema.Types.ObjectId], ref: 'DebtsEntity' },
		status: { type: String, enum: Object.values(checkoutCostStatus), default: checkoutCostStatus['PENDING'] },
		fees: [feesSchema],
		stayDays: { type: Number },
		checkoutCostReceipt: { type: Schema.Types.ObjectId, ref: 'ReceiptsEntity' },
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
		version: { type: Number, default: 1 },
	},
	{ timestamps: true, versionKey: false },
);

CheckoutCostsSchema.index(
	{ contractId: 1, roomId: 1, year: 1, month: 1, checkoutCostReceipt: 1 },
	{
		unique: true,
		partialFilterExpression: {
			contractId: { $exists: true },
		},
	},
);

exports.CheckoutCostsEntity = mongoose.model('CheckoutCostsEntity', CheckoutCostsSchema, 'checkoutCosts');
