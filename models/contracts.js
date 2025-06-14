var mongoose = require('mongoose');
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
		enum: ['person', 'index', 'vehicle', 'room'],
		required: true,
	},
	key: {
		type: String,
	},
});

const PersonSchema = new Schema({
	fullName: { type: String, required: true }, // Họ và tên
	phone: { type: String, required: true }, // Số điện thoại
	email: { type: String }, // Email (không bắt buộc)
	CCCD: { type: String }, // CMND/CCCD
	cccdIssueDate: { type: Date },
	cccdIssueAt: { type: String },
	address: { type: String }, // Địa chỉ thường trú
	dob: { type: Date },
});

const ContractsSchema = new Schema({
	createdAt: {
		type: Date,
		default: Date.now, // Ngày khởi tạo tự động
		required: true,
	},
	contractAddress: {
		type: String,
		required: true, // Địa chỉ lập hợp đồng
	},
	partyA: {
		type: PersonSchema,
		required: true, // Thông tin bên A (chủ hợp đồng)
	},
	fees: [FeeSchema], // Danh sách các khoản phí (mảng)
	rent: {
		type: Number,
		required: true,
	},
	deposit: {
		type: Number,
		required: true,
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'UsersEntity',
	},
	contractSignDate: {
		type: Date,
		required: true,
	},
	contractEndDate: {
		type: Date,
	},
	additionalTerms: { type: String }, // Điều khoản bổ sung (nếu có)
	room: {
		type: Schema.Types.ObjectId,
		ref: 'RoomsEntity',
		required: true,
	},
	contractTerm: {
		type: String,
		required: true,
	},
	note: {
		type: String,
		default: '',
	},
	status: {
		type: String,
		enum: ['active', 'expired', 'terminated'],
		default: 'active',
		required: true,
	},
});

// Register the room schema
exports.ContractsEntity = mongoose.model('ContractsEntity', ContractsSchema, 'contracts');
