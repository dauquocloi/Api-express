var mongoose = require('mongoose');
const Entity = require('./index');
const Schema = mongoose.Schema;
// Create a Mongoose Schema

// Create a Mongoose Schema
const UsersSchema = new Schema(
	[
		{
			username: String,
			password: String,
			fullname: String,
			gender: Number,
			iscontractowner: Boolean,
			birthday: Date,
			address: String,
			phone: String,
			email: String,
			avatar: String,
			cccd: String,
			userType: String,
			room: {
				type: Schema.Types.ObjectId,
				ref: 'RoomsEntity',
			},
		},
	],
	{
		versionKey: false,
		collation: { locale: 'vi' },
	},
);

exports.UsersEntity = mongoose.model('UsersEntity', UsersSchema, 'users');
