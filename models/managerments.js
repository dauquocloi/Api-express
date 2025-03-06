var mongoose = require('mongoose');
const Entity = require('./index');
const Schema = mongoose.Schema;
// Create a Mongoose Schema

// Create a Mongoose Schema
const ManagermentsSchema = new Schema(
	[
		{
			fullname: String,
			gender: Number,
			managermentPermission: String,
			birthday: Date,
			buildingAddress: String,
			avatar: String,
			cccd: String,
		},
	],
	{
		versionKey: false,
		collation: { locale: 'vi' },
	},
);

exports.ManagermentsEntity = mongoose.model('ManagermentsEntity', ManagermentsSchema, 'Managerments');
