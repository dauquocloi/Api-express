var mongoose = require('mongoose');
// const { any } = require('underscore');
const Schema = mongoose.Schema;
const Entity = require('./index');

const ReceiptsSchema = new Schema({
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
	status: { type: String, enum: ['unpaid', 'paid', 'partial', 'pending', 'cancelled'], default: 'unpaid' },
	amount: {
		type: Number,
		min: 0,
	},
	receiptContent: {
		type: String,
		trim: true,
	},
	paymentContent: {
		type: String,
		required: true,
		trim: true,
	},
	date: {
		type: Date,
		default: Date.now,
	},
	payer: {
		type: String,
		trim: true,
	},
	locked: {
		// biểu thị việc hóa đơn đã chốt sổ hay chưa ? => thay đổi khi statistics(lock);
		type: Boolean,
		default: false,
	},
});

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
