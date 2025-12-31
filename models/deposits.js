var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { feeUnit } = require('../constants/fees');
const { depositStatus } = require('../constants/deposits');

const FeeSchema = new Schema({
	feeName: { type: String, required: true },
	feeAmount: { type: Number, required: true },
	unit: { type: String, enum: Object.values(feeUnit), required: true },
	lastIndex: {
		type: Number,
		default: 0,
	},
	feeKey: { type: String },
	iconPath: { type: String },
});

const InteriorSchema = new Schema({
	interiorName: { type: String },
	quantity: { type: Number },
	key: { type: String },
});

const PersonSchema = new Schema({
	fullName: { type: String, required: true },
	phone: { type: String, required: true },
	CCCD: { type: String },
	cccdImage: { type: String },
	cccdIssueDate: { type: Date },
	cccdIssueAt: { type: String },
	address: { type: String }, // Địa chỉ thường trú
	dob: { type: Date },
	sex: { type: String, enum: ['nam', 'nữ'] },
});

const DepositsSchema = new Schema(
	{
		room: { type: Schema.Types.ObjectId, ref: 'RoomsEntity' },
		building: { type: Schema.Types.ObjectId, ref: 'BuildingsEntity' },
		receipt: { type: Schema.Types.ObjectId, ref: 'ReceiptsEntity' },
		contract: { type: Schema.Types.ObjectId, ref: 'ContractsEntity' },
		rent: { type: Number, required: true },
		depositAmount: { type: Number, required: true },
		actualDepositAmount: { type: Number, required: true },
		depositCompletionDate: { type: Date },
		checkinDate: { type: Date },
		rentalTerm: { type: String },
		numberOfOccupants: { type: Number, required: true },
		fees: [FeeSchema],
		interiors: [InteriorSchema],
		customer: { type: PersonSchema, required: true },
		//cancelled: Đã cọc sau đó hủy,
		//close: Đã làm hợp đồng => đã vào ở.
		status: { type: String, enum: Object.values(depositStatus), default: depositStatus['PENDING'] },
		version: { type: Number, default: 1 },
	},
	{ timestamps: true },
);

exports.DepositsEntity = mongoose.model('DepositsEntity', DepositsSchema, 'deposits');
