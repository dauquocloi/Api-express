var mongoose = require('mongoose');
const { feeUnit } = require('../constants/fees');
const { contractStatus } = require('../constants/contracts');
// const { any } = require('underscore');
const Schema = mongoose.Schema;

const FeeSchema = new Schema({
	feeName: {
		type: String,
		required: true,
	},
	feeAmount: {
		type: Number,
		required: true,
	},
	unit: {
		type: String,
		enum: Object.values(feeUnit),
		required: true,
	},
	feeKey: {
		type: String,
	},
	iconPath: {
		type: String,
	},
});

const PersonSchema = new Schema({
	fullName: { type: String, required: true }, // Họ và tên
	phone: { type: String, required: true }, // Số điện thoại
	email: { type: String }, // Email (không bắt buộc)
	cccd: { type: String }, // CMND/CCCD
	cccdIssueDate: { type: Date },
	cccdIssueAt: { type: String },
	address: { type: String }, // Địa chỉ thường trú
	dob: { type: Date },
});

const ContractsPdfFileSchema = new Schema({
	CREATED_DATE: {
		DAY: String,
		MONTH: String,
		YEAR: String,
	},
	PARTY_B: {
		FULLNAME: { type: String },
		DOB: { type: String },
		ADDRESS: { type: String },
		CCCD: { type: String },
		CCCD_DATE: { type: String },
		CCCD_AT: { type: String },
		PHONE: { type: String },
	},

	FEES: [
		{
			NAME: { type: String },
			AMOUNT: { type: String },
			TYPE: { type: String },
		},
	],
	INTERIORS: [
		{
			NAME: { type: String },
			QUANT: { type: String },
		},
	],
	DEPOSIT: { type: String },
	SIGN_DATE: {
		DAY: String,
		MONTH: String,
		YEAR: String,
	},
	END_DATE: { DAY: String, MONTH: String, YEAR: String },
	CONTRACT_TERM: { type: String },
	ROOM_PRICE: { type: String },
});

const ContractsSchema = new Schema(
	{
		room: { type: Schema.Types.ObjectId, ref: 'RoomsEntity', required: true },
		depositReceiptId: { type: Schema.Types.ObjectId, ref: 'ReceiptsEntity', required: false },
		depositId: { type: Schema.Types.ObjectId, ref: 'DepositsEntity' },
		user: { type: Schema.Types.ObjectId, ref: 'UsersEntity' }, //owner A
		customer: { type: Schema.Types.ObjectId, ref: 'CustomersEntity' }, // owner B
		fees: [FeeSchema],
		rent: { type: Number, required: true },
		depositAmount: { type: Number },
		contractSignDate: { type: Date, required: true },
		contractEndDate: { type: Date, required: true },
		expectedMoveOutDate: { type: Date },
		isEarlyTermination: { type: Boolean, default: false },
		additionalTerms: { type: String }, // Điều khoản bổ sung (nếu có)
		status: {
			type: String,
			enum: Object.values(contractStatus),
			default: contractStatus['PENDING'],
			required: true,
		},
		contractTerm: { type: String, required: true },
		note: { type: String, default: '' },
		contractPdfUrl: { type: String },
		contractPdfFile: { type: ContractsPdfFileSchema },
		contractCode: { type: String, required: true, unique: true },
		isCustomerConfirmed: { type: Boolean, default: false },
		//for contract extension
		versions: [
			{
				version: Number,
				rent: Number,
				depositAmount: Number,
				contractSignDate: Date,
				contractEndDate: Date,
				contractPdfUrl: String,
				contractPdfFile: ContractsPdfFileSchema,
				customerConfirmed: Boolean,
				status: {
					type: String,
					enum: Object.values(contractStatus),
					default: contractStatus['PENDING'],
					required: true,
				},
				createdAt: Date,
			},
		],
		version: { type: Number, default: 1 },
	},
	{ timestamps: true },
);

ContractsSchema.index(
	{ room: 1, status: 1 },
	{
		unique: true,
		partialFilterExpression: { status: 'active' },
	},
);

// Register the room schema
exports.ContractsEntity = mongoose.model('ContractsEntity', ContractsSchema, 'contracts');
