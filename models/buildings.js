var mongoose = require('mongoose');
require('mongoose-double')(mongoose);
const Schema = mongoose.Schema;

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
var BuildingsSchema = new Schema(
	{
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
			validate: {
				validator: function (v) {
					return /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg)$/.test(v);
				},
				message: 'Invalid image URL',
			},
		},

		bank: {
			type: Schema.Types.ObjectId,
			ref: 'banks',
			default: null,
		},
		contractDocxUrl: { type: String },
		contractPdfUrl: { type: String },
		depositTermUrl: { type: String },

		management: [
			{
				_id: false, // Tắt tự động thêm _id
				user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
				role: { type: String, enum: ['owner', 'manager', 'staff'], required: true },
			},
		],
		invoiceNotes: { type: String, default: '' },
		settings: { type: PermissionsSchema },
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

// BuildingsSchema.post('find', async (docs, next) => {
// 	try {
// 		if (docs?.contractDocxUrl) {

// 		}
// 	}
// })

// Register the room schema
exports.BuildingsEntity = mongoose.model('BuildingsEntity', BuildingsSchema, 'buildings');
