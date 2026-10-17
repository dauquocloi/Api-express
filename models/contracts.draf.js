var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const listFeeInitial = require('../utils/getListFeeInital');
const FEE_KEYS = listFeeInitial.map((item) => item.feeKey);

const FeeSchema = new Schema({
	feeAmount: {
		type: Number,
		required: true,
	},
	feeKey: {
		type: String,
		enum: FEE_KEYS,
		required: true,
	},
	lastIndex: {
		type: Number,
		default: 0,
	},
});

const PersonSchema = new Schema({
	fullName: { type: String, required: true },
	phone: { type: String, required: true },
	cccd: { type: String },
	cccdIssueDate: { type: Date },
	cccdIssueAt: { type: String },
	address: { type: String },
	dob: { type: Date },
	vehicleLicensePlate: { type: String },
	job: { type: String },
	sex: { type: String, enum: ['nam', 'nữ'], default: 'nam' },
});

const InteriorSchema = new Schema({
	interiorName: { type: String },
	quantity: { type: Number },
	date: { type: Date, default: Date.now },
});

const ContractDraftsSchema = new Schema(
	{
		room: { type: Schema.Types.ObjectId, ref: 'RoomsEntity', required: true },
		building: { type: Schema.Types.ObjectId, ref: 'BuildingsEntity' },
		depositReceiptId: { type: Schema.Types.ObjectId, ref: 'ReceiptsEntity' },
		firstInvoiceId: { type: Schema.Types.ObjectId, ref: 'InvoicesEntity' },
		depositId: { type: Schema.Types.ObjectId, ref: 'DepositsEntity', default: null },
		rent: { type: Number, required: true },
		depositAmount: { type: Number, required: true },

		fees: [FeeSchema],
		interiors: [InteriorSchema],
		customers: [PersonSchema],

		contractSignDate: { type: Date, required: true },
		contractEndDate: { type: Date, required: true },

		additionalTerms: { type: String }, // Điều khoản bổ sung (nếu có)
		status: {
			type: String,
			default: 'draft',
		},
		contractTerm: { type: String, required: true },
		note: { type: String, default: '' },
		contractDocument: {
			filePath: { type: String },
			previewId: { type: String, required: true },
			createdAt: { type: Date, default: Date.now() },
			expAt: { type: Date, required: true },
			size: { type: Number },
		},
	},
	{ timestamps: true },
);

// Register the room schema
exports.ContractDraftsEntity = mongoose.model('ContractDraftsEntity', ContractDraftsSchema, 'contractDrafts');
