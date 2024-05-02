var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a Mongoose Schema
const CustomersSchema = new Schema(
	[
		{
			fullname: String,
			gender: Number,
			iscontractowner: Boolean,
			birthday: Date,
			address: String,
			phone: String,
			email: String,
			avatar: String,
			cccd: String,
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

exports.CustomersEntity = mongoose.model('CustomersEntity', CustomersSchema, 'customers');
