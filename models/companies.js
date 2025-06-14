var mongoose = require('mongoose');
// (Schema = mongoose.Schema), (ObjectId = Schema.ObjectId);
require('mongoose-double')(mongoose);

const Schema = mongoose.Schema;
// Create a Mongoose Schema
var CompaniesSchema = new Schema(
	{
		companyId: {
			type: String,
			trim: true,
			required: true,
		},
		fullName: {
			type: String,
			trim: true,
			maxLength: 200,
		},
		shortName: {
			type: String,
			trim: true,
			maxLength: 20,
		},
		status: {
			type: String,
			enum: ['Pending', 'Active', 'Suspended', 'Terminated', 'Cancelled', 'Fraud'],
		},
		createdAt: {
			type: Date,
			default: () => Date.now(),
		},
		updatedAt: {
			type: Date,
			default: () => Date.now(),
		},
		owner: {
			type: Schema.Types.ObjectId,
			ref: 'users',
		},
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

// Register the room schema
exports.CompaniesEntity = mongoose.model('CompaniesEntity', CompaniesSchema, 'companies');
