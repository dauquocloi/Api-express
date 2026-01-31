const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Roles = require('../constants/userRoles');
const { paymentConfirmationMode } = require('../constants/buildings');

const PermissionsSchema = new Schema(
	{
		managerCollectCash: { type: Boolean, default: true },
		managerEditRoomFee: { type: Boolean, default: true },
		managerEditInvoice: { type: Boolean, default: true },
		managerDeleteInvoice: { type: Boolean, default: true },
		managerAddExpenditure: { type: Boolean, default: true },
		managerAddIncidentalIncome: { type: Boolean, default: true },
		managerEditContract: { type: Boolean, default: true },
	},
	{ _id: false },
);

// Create a Mongoose Schema
const BuildingsSchema = new Schema(
	{
		paymentConfirmationMode: {
			type: String,
			enum: Object.values(paymentConfirmationMode),
			default: paymentConfirmationMode['AUTO'],
		},
		buildingName: {
			type: String,
			required: true,
			trim: true,
		}, // Để hiển thị ở thanh lọc (short name).
		buildingAddress: {
			type: String,
			required: true,
			trim: true,
		},
		roomQuantity: {
			type: Number,
			min: [0, 'Room quantity cannot be negative'],
			default: 0,
		},
		about: {
			type: String,
			trim: true,
		},
		images: {
			type: [String],
		},

		contractDocxUrl: { type: String },
		contractPdfUrl: { type: String },
		depositTermUrl: { type: String },

		management: [
			{
				_id: false, // Tắt tự động thêm _id
				user: { type: mongoose.Schema.Types.ObjectId, ref: 'UsersEntity', required: true },
				role: { type: String, enum: Object.values(Roles), required: true },
			},
		],
		invoiceNotes: { type: String, default: '' },
		settings: PermissionsSchema,
		paymentInfo: { type: Schema.Types.ObjectId, ref: 'BankAccountsEntity' },
		version: { type: Number, default: 1 },
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

exports.BuildingsEntity = mongoose.model('BuildingsEntity', BuildingsSchema, 'buildings');
