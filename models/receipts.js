var mongoose = require('mongoose');
// const { any } = require('underscore');
const Schema = mongoose.Schema;
const Entity = require('./index');

const ReceiptsSchema = new Schema(
	{
		month: {
			type: Number,
			required: false,
			min: [1, 'month must be at least 1'],
			max: [12, 'month cannot exceed 30'],
			validate: {
				validator: Number.isInteger,
				message: 'month must be an integer',
			},
		}, // Tháng (1 - 12)
		year: {
			type: Number,
			required: false,
			validate: {
				validator: Number.isInteger,
				message: 'years must be an integer',
			},
		}, // Năm
		room: {
			type: Schema.Types.ObjectId,
			ref: 'RoomsEntity',
		},
		receiptType: {
			type: String,
			enum: ['deposit', 'incidental', 'debts', 'checkout'],
			default: 'incidental',
		},
		// if receiptType === deposit => isContractCreated required.
		isContractCreated: {
			type: Boolean,
			default: false,
		},
		// terminated: "Bỏ cọc => ghi nhận thu",
		// cancelled: "Hủy => ko ghi nhận thu, ghi nhận giao dịch"
		status: { type: String, enum: ['unpaid', 'paid', 'partial', 'pending', 'cancelled', 'terminated'], default: 'unpaid' },
		amount: {
			type: Number,
			min: 0,
		},
		paidAmount: {
			type: Number,
			min: 0,
			default: 0,
		},
		carriedOverPaidAmount: {
			// used for depositReceipt => if receipt raise
			type: Number,
			min: 0,
			default: 0,
		},
		receiptContent: {
			type: String,
			trim: true,
		},
		receiptContentDetail: {
			type: String,
		},
		paymentContent: {
			type: String,
			required: true,
			trim: true,
			unique: true,
		},
		date: {
			type: Date,
			default: Date.now,
		},
		isDepositing: { type: Boolean, default: false },
		payer: {
			type: String,
			trim: true,
		},
		locked: {
			// biểu thị việc hóa đơn đã chốt sổ hay chưa ? => thay đổi khi statistics(lock);
			type: Boolean,
			default: false,
		},
		// for receiptType: deposit
		isActive: {
			type: Boolean,
			default: true,
		},
		receiptCode: {
			type: String,
			trim: true,
		},
		// Nd: Số tiền chưa thanh toán, còn thiếu, đã được trừ vào tiền hoàn cọc.
		isDepositDeducted: { type: Boolean, default: false },
		detuctedInfo: {
			detuctedType: { type: String, enum: ['depositRefund', 'terminateContractEarly'] },
			detuctedId: { type: Schema.Types.ObjectId },
		},
		version: {
			type: Number,
			default: 1,
		},
	},
	{
		timestamps: true,
	},
);

ReceiptsSchema.pre('save', async function (next) {
	if (!this.payer) {
		const currentCustomer = await Entity.CustomersEntity.findOne({ room: this.room, isContractOwner: true });
		console.log('log of currentCustomer from Pre-save receiptsSchema: ', currentCustomer);
		if (currentCustomer != null) {
			this.payer = currentCustomer.fullName;
		}
	}
	next();
});

exports.ReceiptsEntity = mongoose.model('ReceiptsEntity', ReceiptsSchema, 'receipts');
