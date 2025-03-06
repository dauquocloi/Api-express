var mongoose = require('mongoose');
const Entity = require('./index');
const Schema = mongoose.Schema;
// Create a Mongoose Schema

// Create a Mongoose Schema
const UsersSchema = new Schema(
	[
		{
			username: {
				type: String,
				required: true,
				unique: true,
			},
			password: {
				type: String,
				required: true,
			},
			fullname: String,
			gender: Number,
			iscontractowner: Boolean,
			birthday: Date,

			email: String,
			avatar: String,
			cccd: String,
			checkinDate: {
				type: Date,
			},
			role: {
				type: String,
				enum: ['owner', 'customer', 'sale', 'admin'],
				required: true,
			},
			expoPushToken: {
				type: String,
				unique: true,
			},
		},
	],
	{
		versionKey: false,
		collation: { locale: 'vi' },
	},
);

exports.UsersEntity = mongoose.model('UsersEntity', UsersSchema, 'users');
