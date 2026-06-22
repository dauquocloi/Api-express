const mongoose = require('mongoose');
const { COMPANIES_STATUS } = require('../constants/companies');
const { PERMISSIONS } = require('../constants/permissions');

const Schema = mongoose.Schema;
const PermissionsSchema = new Schema(
	{
		[PERMISSIONS['COLLECT_CASH']]: { type: Boolean, default: true },
		[PERMISSIONS['EDIT_FEE']]: { type: Boolean, default: true },
		[PERMISSIONS['EDIT_BILL']]: { type: Boolean, default: true },
		[PERMISSIONS['DELETE_BILL']]: { type: Boolean, default: true },
		[PERMISSIONS['EDIT_CONTRACT']]: { type: Boolean, default: true },
	},
	{ _id: false, versionKey: false },
);

const CompaniesSchema = new Schema(
	{
		companyId: {
			// from sepay create companies response.
			type: String,
			trim: true,
			// required: true,
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
			enum: Object.values(COMPANIES_STATUS),
			default: COMPANIES_STATUS.PENDING,
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: 'UsersEntity',
		},
		permissions: {
			type: PermissionsSchema,
			default: () => ({}),
		},
		version: { type: Number, default: 1 },
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true,
	},
);

// Register the room schema
exports.CompaniesEntity = mongoose.model('CompaniesEntity', CompaniesSchema, 'companies');
