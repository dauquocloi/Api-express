var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create  Mongoose Schema
const TransactionsSchema = new mongoose.Schema(
	{
		bankAccountId: { type: Schema.Types.ObjectId, required: false, ref: 'BankAccountsEntity', unique: true }, // ID tài khoản ngân hàng (nếu có)
		gateway: { type: String, required: false }, // Cổng thanh toán vd: mb, ocb,...
		transactionDate: { type: Date, required: true }, // Ngày giao dịch
		accountNumber: { type: String, required: false, unique: true }, // Số tài khoản người nhận
		va: { type: String, default: null }, // Số tài khoản ảo (nếu có)
		paymentCode: { type: String, default: null }, // Mã thanh toán (nếu có)
		content: { type: String, trim: true, required: false }, // Nội dung giao dịch
		transferType: { type: String, enum: ['credit', 'debit'], default: 'credit' }, // Loại giao dịch
		amount: { type: Number, required: true }, // Số tiền giao dịch
		referenceCode: { type: String, required: false }, // Mã tham chiếu giao dịch
		// accumulated: { type: Number, required: true }, // Số dư tích lũy (chưa hỗ trợ)
		transactionId: { type: String, required: false, unique: true }, // ID giao dịch (from bank)
		idempotencyKey: { type: String, required: true, unique: true }, // ID request
		paymentMethod: { type: String, enum: ['transfer', 'cash'], required: true }, // Loại thanh toán

		isTransactionDetected: { type: Boolean, default: false },
		invoice: {
			type: Schema.Types.ObjectId,
			ref: 'InvoicesEntity',
			default: null,
		},
		receipt: {
			type: Schema.Types.ObjectId,
			ref: 'ReceiptsEntity',
			default: null,
		},
		month: {
			type: Number,
			required: false,
			min: 1,
			max: 12,
			default: null,
		}, // Tháng (1 - 12)
		year: {
			type: Number,
			required: false,
			default: null,
		},
		collector: {
			type: Schema.Types.ObjectId,
			ref: 'UsersEntity',
			default: null,
		},
	},
	{ timestamps: true }, // Tự động thêm createdAt và updatedAt
);

exports.TransactionsEntity = mongoose.model('TransactionsEntity', TransactionsSchema, 'transactions');
