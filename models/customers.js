var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a Mongoose Schema
const CustomersSchema = new Schema(
	[
		{
			fullName: {
				type: String,
				required: true,
			},

			gender: {
				type: String,
				enum: ['Nam', 'Nữ'],
			},
			iscontractowner: Boolean,
			birthday: Date,
			permanentAddress: String,
			phone: String,
			email: String,
			avatar: String,
			cccd: {
				type: String,
				unique: true,
			},
			cccdIssueDate: {
				type: Date,
			},
			status: {
				type: Number,
				default: 0, // 0: Đã dọn đi, 1: Đang ở, 2: Tạm vắng
				required: true,
			},
			room: {
				type: Schema.Types.ObjectId,
				ref: 'RoomsEntity',
				required: true,
			},
			user: {
				type: Schema.Types.ObjectId,
				ref: 'UsersEntity',
			},
			customerPermission: String,
			temporaryResidence: Boolean,
			checkinDate: {
				type: Date,
				default: () => Date.now(),
			},
		},
	],
	{
		versionKey: false,
		collation: { locale: 'vi' },
	},
);

exports.CustomersEntity = mongoose.model('CustomersEntity', CustomersSchema, 'customers');
