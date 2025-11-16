var mongoose = require('mongoose');
// const { any } = require('underscore');
const Schema = mongoose.Schema;
const Entity = require('./index');
const FeesSchema = require('./fees');
const { number } = require('joi');

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

FeeInvoiceSchema.pre('validate', function (next) {
	if (this.type === 'index' && (this.firstIndex == null || this.lastIndex == null)) {
		return next(new Error('firstIndex và lastIndex là bắt buộc khi type là "index"'));
	}
	if ((this.type === 'person' || this.type === 'vehicle') && this.quantity == null) {
		return next(new Error('quantity là bắt buộc khi type là "person" hoặc "vehicle"'));
	}
	next();
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
		}, // Tháng (1 - 12)
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
		//terminated: Đã bị chủ nhà xóa => 0 ghi nhận doanh thu
		//cencelled: Đã đóng, 0 còn nhận thu tiền nữa
		status: { type: String, enum: ['unpaid', 'paid', 'partial', 'cencelled', 'terminated'], default: 'unpaid' },
		invoiceType: { type: String, enum: ['firstInvoice', 'rental'], default: 'rental' },
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
		creater: {
			type: Schema.Types.ObjectId,
			ref: 'users',
		},
		invoiceContent: {
			type: String,
			trim: true,
		},
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

InvoicesSchema.pre('save', async function (next) {
	if (!this.payer) {
		const currentCustomer = await Entity.CustomersEntity.findOne({ room: this.room, isContractOwner: true });
		console.log('log of currentCustomer from Pre-save InvoicesSchema: ', currentCustomer);
		if (currentCustomer != null) {
			this.payer = currentCustomer.fullName;
		}
	}
	next();
});

exports.InvoicesEntity = mongoose.model('InvoicesEntity', InvoicesSchema, 'invoices');
