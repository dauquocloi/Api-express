// var mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// // Create a Mongoose Schema
// const RevenuesSchema = new Schema({
// 	locked: {
// 		type: Boolean,
// 		default: false,
// 	},
// 	month: {
// 		type: Number,
// 		required: true,
// 		min: [1, 'month must be at least 1'],
// 		max: [12, 'month cannot exceed 30'],
// 		validate: {
// 			validator: Number.isInteger,
// 			message: 'month must be an integer',
// 		},
// 	}, // Tháng (1 - 12)
// 	year: {
// 		type: Number,
// 		required: true,
// 		validate: {
// 			validator: Number.isInteger,
// 			message: 'years must be an integer',
// 		},
// 	}, // Năm
// 	amount: { type: Number, default: 0 }, // Tổng tiền thu được trong tháng
// 	recurringInvoices: [
// 		{
// 			feeName: { type: String, required: true },
// 			totalAmount: { type: Number, required: true },
// 		},
// 	],
// 	additionalInvoices: [
// 		{
// 			invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }, // ID của hóa đơn phát sinh
// 			amount: { type: Number, required: true }, // Tổng tiền của hóa đơn phát sinh
// 			description: { type: String }, // Mô tả chi tiết
// 			date: { type: Date, required: true }, // Ngày phát sinh
// 		},
// 	],
// });

// exports.RevenuesEntity = mongoose.model('RevenuesEntity', RevenuesSchema, 'revenues');
