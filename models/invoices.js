var mongoose = require('mongoose');
// const { any } = require('underscore');
const Schema = mongoose.Schema;
const Entity = require('./index');
const { invoiceStatus } = require('../constants/invoices');

const FeeInvoiceSchema = new Schema({
	feeName: String,
	amount: Number,
	unit: {
		enum: ['person', 'index', 'vehicle', 'room'],
		type: String,
		required: true,
	},
	quantity: {
		type: Number,
		required: function () {
			return this.type === 'person' || this.type === 'vehicle';
		},
	},
	firstIndex: {
		type: Number,
		required: function () {
			return this.type === 'index';
		},
	},
	lastIndex: {
		type: Number,
		required: function () {
			return this.type === 'index';
		},
	},
	feeAmount: {
		type: Number,
		required: true,
	},
	feeKey: {
		type: String,
	},
});

const InvoicesSchema = new Schema(
	{
		stayDays: {
			type: Number,
			default: 30,

			validate: {
				validator: Number.isInteger,
				message: 'stayDays must be an integer',
			},
		},
		month: {
			type: Number,
			required: true,
			min: [1, 'month must be at least 1'],
			max: [12, 'month cannot exceed 30'],
			validate: {
				validator: Number.isInteger,
				message: 'month must be an integer',
			},
		},
		year: {
			type: Number,
			required: true,
			validate: {
				validator: Number.isInteger,
				message: 'years must be an integer',
			},
		}, // Năm
		room: {
			type: Schema.Types.ObjectId,
			ref: 'RoomsEntity',
		},
		total: {
			type: Number,
			required: true,
			default: 0,
		},
		paidAmount: {
			type: Number,
			min: 0,
			default: 0,
		},
		status: { type: String, enum: Object.values(invoiceStatus), default: 'unpaid' },
		invoiceType: { type: String, enum: ['firstInvoice', 'rental'], default: 'rental' },
		// Dành cho hoàn cọc => Khách không thể lấy tt thanh toán trên hệ thống web-view
		isDepositing: { type: Boolean, default: false },
		// Nd: Số tiền chưa thanh toán, còn thiếu, đã được trừ vào tiền hoàn cọc.
		isDepositDeducted: { type: Boolean, default: false },
		detuctedInfo: {
			detuctedType: { type: String, enum: ['depositRefund', 'terminateContractEarly'] },
			detuctedId: { type: Schema.Types.ObjectId },
		},
		fee: [FeeInvoiceSchema],
		debts: [{ content: { type: String }, amount: { type: Number, default: 0 }, month: { type: Number }, year: { type: Number } }],
		payer: {
			type: String,
			trim: true,
			required: true,
		},
		paymentContent: {
			type: String,
			required: true,
			trim: true,
		},
		locked: {
			// biểu thị việc hóa đơn đã chốt sổ hay chưa ? => thay đổi khi statistics(lock);
			type: Boolean,
			default: false,
		},
		invoiceCode: {
			type: String,
			trim: true,
			unique: true,
		},
		note: {
			type: String,
			trim: true,
		},
		// creator stupid
		creater: {
			type: Schema.Types.ObjectId,
			ref: 'users',
		},
		invoiceContent: {
			type: String,
			trim: true,
		},
		version: {
			type: Number,
			default: 1,
		},
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

exports.InvoicesEntity = mongoose.model('InvoicesEntity', InvoicesSchema, 'invoices');
