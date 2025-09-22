var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create  Mongoose Schema
const TransactionsSchema = new mongoose.Schema(
	{
		gateway: { type: String, required: false }, // Cổng thanh toán vd: mb, ocb,...
		transactionDate: { type: Date, required: true }, // Ngày giao dịch
		accountNumber: { type: String, required: false }, // Số tài khoản người gửi
		bankAccountId: { type: String, required: false }, // ID tài khoản ngân hàng (nếu có)
		// AccountOwnerName: { type: String, trim: true }, // Tên tài khoản người nhận // gọi api sepay lấy tên chủ tk
		va: { type: String, default: null }, // Số tài khoản ảo (nếu có)
		paymentCode: { type: String, default: null }, // Mã thanh toán (nếu có)
		content: { type: String, trim: true, required: false }, // Nội dung giao dịch
		transferType: { type: String, enum: ['credit', 'debit'], required: true }, // Loại giao dịch
		amount: { type: Number, required: true }, // Số tiền giao dịch
		referenceCode: { type: String, required: false }, // Mã tham chiếu giao dịch
		// accumulated: { type: Number, required: true }, // Số dư tích lũy (chưa hỗ trợ)
		transactionId: { type: String, required: false }, // ID giao dịch
		paymentMethod: { type: String, enum: ['transfer', 'cash'], required: true }, // Loại thanh toán
		invoice: {
			type: Schema.Types.ObjectId,
			ref: 'invoices',
			default: null,
		},
		receipt: {
			type: Schema.Types.ObjectId,
			ref: 'receipts',
			default: null,
		},
		month: {
			type: Number,
			required: false,
			min: [1, 'month must be at least 1'],
			max: [12, 'month cannot exceed 12'],
			validate: {
				validator: Number.isInteger,
				message: 'month must be an integer',
			},
		}, // Tháng (1 - 12)
		year: {
			type: Number,
			required: false,
		},
		collector: {
			type: Schema.Types.ObjectId,
			ref: 'users',
			default: null,
		},
	},
	{ timestamps: true }, // Tự động thêm createdAt và updatedAt
);

exports.TransactionsEntity = mongoose.model('TransactionsEntity', TransactionsSchema, 'transactions');
