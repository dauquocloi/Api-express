var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a Mongoose Schema
const CustomersSchema = new Schema(
	{
		fullName: {
			type: String,
			require: true,
		},

		gender: {
			type: String,
			enum: ['nam', 'nữ'],
		},
		isContractOwner: {
			type: Boolean,
			default: false,
		},
		birthday: Date,
		permanentAddress: String,
		phone: String,

		avatar: {
			type: String,
			default: '',
		},
		cccd: {
			type: String,
			unique: true,
			trim: true,
		},
		cccdIssueDate: {
			type: Date,
		},
		status: {
			type: Number,
			default: 0, // 0: Đã dọn đi, 1: Đang ở, 2: Tạm vắng
			required: true,
			enum: [0, 1, 2],
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
		temporaryResidence: {
			type: Boolean,
			default: false,
		},
		checkinDate: {
			type: Date,
			default: () => Date.now(),
		},
		checkoutDate: {
			type: Date,
		},
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		autoIndex: true, //just for dev
	},
);

exports.CustomersEntity = mongoose.model('CustomersEntity', CustomersSchema, 'customers');

// CustomersSchema.('save', async (docs) => {
// 	try {

// 	}
// })
