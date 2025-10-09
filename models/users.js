var mongoose = require('mongoose');
const Entity = require('./index');
const { unique } = require('underscore');
const Schema = mongoose.Schema;
// Create a Mongoose Schema

// Create a Mongoose Schema
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
		},
		role: {
			type: String,
			enum: ['owner', 'customer', 'sale', 'admin', 'manager', 'guest', 'staff'],
			required: true,
		},
		expoPushToken: {
			type: String,
			unique: true,
			default: '',
		},
		tokens: [
			{
				type: String,
				unique: true,
				default: '',
			},
		],
	},

	{
		versionKey: false,
		collation: { locale: 'vi' },
	},
);

exports.UsersEntity = mongoose.model('UsersEntity', UsersSchema, 'users');
