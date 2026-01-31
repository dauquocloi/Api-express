const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Roles = require('../constants/userRoles');

const UsersSchema = new Schema(
	{
		username: {
			type: String,
			required: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
			trim: true,
		},
		fullName: {
			type: String,
			required: false,
		},
		permanentAddress: {
			type: String,
			trim: true,
			required: false,
		},
		phone: {
			type: String,
			match: [/^(0[1|3|5|7|8|9])([0-9]{8,9})$/, 'Invalid phone number format'],
			required: [true, 'phone is required'],
			unique: true,
		},
		birthdate: Date,
		avatar: {
			type: String,
			default: '',
		},
		cccd: {
			type: String,
			trim: true,
			required: false,
		},
		cccdIssueDate: {
			type: Date,
		},
		cccdIssueAt: {
			type: String,
			trim: true,
		},
		role: {
			type: String,
			enum: Object.values(Roles),
			required: true,
		},
		expoPushToken: {
			type: String,
			unique: true,
			default: '',
		},
		deviceId: { type: String },
		platform: { type: String },

		gender: {
			type: String,
			enum: ['nam', 'nữ'],
			default: 'nam',
		},
		status: {
			type: String,
			enum: ['active', 'inactive'],
			default: 'active',
		},
		notificationSetting: {
			type: Schema.Types.ObjectId,
			ref: 'NotificationSettingsEntity',
			default: null,
			// required: true,
		},
	},

	{
		versionKey: false,
		collation: { locale: 'vi' },
	},
);

exports.UsersEntity = mongoose.model('UsersEntity', UsersSchema, 'users');
