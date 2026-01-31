const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FeeIndexHistorySchema = new Schema(
	{
		room: {
			type: Schema.Types.ObjectId,
			ref: 'RoomsEntity',
			required: true,
		},
		feeKey: {
			type: String,
			required: true,
		},
		fee: {
			type: Schema.Types.ObjectId,
			ref: 'FeesEntity',
			required: true,
		},

		prevIndex: {
			type: Number,
			require: true,
		},
		lastIndex: {
			type: Number,
			required: true,
		},

		prevEditor: {
			type: Schema.Types.ObjectId,
			ref: 'UsersEntity',
			required: true,
		},
		lastEditor: {
			type: Schema.Types.ObjectId,
			ref: 'UsersEntity',
			required: true,
		},

		prevUpdated: {
			type: Date,
		},
		lastUpdated: {
			type: Date,
			default: Date.now,
		},
	},
	{
		timestamps: true,
	},
);

FeeIndexHistorySchema.index(
	{
		room: 1,
		feeKey: 1,
		fee: 1,
	},
	{
		unique: true,
	},
);

exports.FeeIndexHistoryEntity = mongoose.model('FeeIndexHistoryEntity', FeeIndexHistorySchema, 'feeIndexHistory');
