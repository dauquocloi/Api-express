var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { invoiceStatus, feeUnit, DETUCTED_TYPE, invoiceType } = require('../constants');
const initialFees = require('../utils/getListFeeInital');
const FEE_KEYS = initialFees.map((item) => item.feeKey);

const FeeInvoiceSchema = new Schema({
	feeName: String,
	amount: Number,
	unit: {
		enum: Object.values(feeUnit),
		type: String,
		required: true,
	},
	quantity: {
		type: Number,
		required: function () {
			return this.type === feeUnit['PERSON'] || this.type === feeUnit['VEHICLE'];
		},
	},
	firstIndex: {
		type: Number,
		required: function () {
			return this.type === feeUnit['INDEX'];
		},
	},
	lastIndex: {
		type: Number,
		required: function () {
			return this.type === feeUnit['INDEX'];
		},
	},
	feeAmount: {
		type: Number,
		required: true,
	},
	feeKey: {
		type: String,
		enum: FEE_KEYS,
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
		status: { type: String, enum: Object.values(invoiceStatus), default: invoiceStatus['UNPAID'] },
		invoiceType: { type: String, enum: Object.values(invoiceType), default: invoiceType['RENTAL'] },
		// Dành cho hoàn cọc => Khách không thể lấy tt thanh toán trên hệ thống web-view
		// isDepositing: { type: Boolean, default: false },
		// Nd: Số tiền chưa thanh toán, còn thiếu, đã được trừ vào tiền hoàn cọc.
		isDepositDeducted: { type: Boolean, default: false },
		detuctedInfo: {
			detuctedType: { type: String, enum: Object.values(DETUCTED_TYPE) },
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
			ref: 'UsersEntity',
		},
		invoiceContent: {
			type: String,
			trim: true,
		},
		contract: {
			type: Schema.Types.ObjectId,
			ref: 'ContractsEntity',
			required: function () {
				return this.invoiceType === invoiceType['RENTAL'];
			},
		},
		version: {
			type: Number,
			default: 1,
		},
		// For delete index => revert feeIndex
		feeIndexSnapshot: {
			type: [
				{
					feeKey: {
						type: String,
						enum: FEE_KEYS,
						required: true,
					},
					lastIndex: {
						type: Number,
						required: true,
					},
				},
			],
			required: true,
		},
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

exports.InvoicesEntity = mongoose.model('InvoicesEntity', InvoicesSchema, 'invoices');
