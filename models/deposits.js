var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FeeSchema = new Schema({
	feeName: { type: String, required: true },
	feeAmount: { type: Number, required: true },
	unit: { type: String, enum: ['person', 'index', 'vehicle', 'room'], required: true },
	iconPath: { type: String },
	key: { type: String },
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

const DepositsSchema = new Schema({
	room: { type: Schema.Types.ObjectId, ref: 'rooms' },
	building: { type: Schema.Types.ObjectId, ref: 'buildings' },
	receipt: { type: Schema.Types.ObjectId, ref: 'receipts' },
	rent: { type: Number, required: true },
	depositAmount: { type: Number, required: true },
	actualDepositAmount: { type: Number, required: true },
	depositCompletionDate: { type: Date },
	checkinDate: { type: Date },
	rentalTerm: { type: String },
	fees: [FeeSchema],
	interiors: [InteriorSchema],
	customer: { type: PersonSchema, required: true },
	numberOfOccupants: { type: Number, required: true, default: 1 },
	status: { type: String, enum: ['cancelled', 'pending', 'close', 'paid', 'partial'] },
});

exports.DepositsEntity = mongoose.model('DepositsEntity', DepositsSchema, 'deposits');
