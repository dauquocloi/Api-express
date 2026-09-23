const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { UPDATE_FEE_INDEX_SOURCE } = require('../constants');

const FeeIndexRecordsSchema = new Schema(
	{
		room: {
			type: Schema.Types.ObjectId,
			ref: 'RoomsEntity',
			required: true,
		},
		fee: {
			type: Schema.Types.ObjectId,
			ref: 'FeesEntity',
			required: true,
		},

		fromIndex: {
			type: Number,
			require: true,
		},
		toIndex: {
			type: Number,
			required: true,
		},
		editor: {
			type: Schema.Types.ObjectId,
			ref: 'UsersEntity',
			required: true,
		},
		fromSource: {
			type: String,
			enum: Object.values(UPDATE_FEE_INDEX_SOURCE),
			required: true,
		},
	},
	{
		timestamps: {
			createdAt: true,
			updatedAt: false,
		},
	},
);

FeeIndexRecordsSchema.index({
	room: 1,
	fee: 1,
});

exports.FeeIndexRecordsEntity = mongoose.model('FeeIndexRecordsEntity', FeeIndexRecordsSchema, 'feeIndexRecords');
