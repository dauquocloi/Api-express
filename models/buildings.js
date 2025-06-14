var mongoose = require('mongoose');
// (Schema = mongoose.Schema), (ObjectId = Schema.ObjectId);
require('mongoose-double')(mongoose);

const Schema = mongoose.Schema;
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
		images: [
			{
				type: String,
				validate: {
					validator: function (v) {
						return /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg)$/.test(v);
					},
					message: 'Invalid image URL',
				},
			},
		],
		bank: {
			type: Schema.Types.ObjectId,
			ref: 'banks',
			default: null,
		},
		management: [
			{
				_id: false, // Tắt tự động thêm _id
				user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
				role: { type: String, enum: ['owner', 'manager'], required: true },
			},
		],
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

// Register the room schema
exports.BuildingsEntity = mongoose.model('BuildingsEntity', BuildingsSchema, 'buildings');
