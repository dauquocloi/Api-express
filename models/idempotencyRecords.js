const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { IDEMPOTENCY_RECORD_STATUS } = require('../constants');

const IdempotencyRecordsSchema = new Schema(
	{
		key: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		status: {
			type: String,
			enum: Object.values(IDEMPOTENCY_RECORD_STATUS),
			default: IDEMPOTENCY_RECORD_STATUS.PROCESSING,
			required: true,
		},
		requestHash: {
			type: String,
		},
		responseCode: {
			type: Number,
		},
		responseBody: {
			type: Schema.Types.Mixed,
		},
		resourceId: {
			type: Schema.Types.ObjectId,
		},
		endPoint: {
			type: String,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
		},
		processingExpiresAt: {
			type: Date,
		},
	},
	{
		timestamps: true,
	},
);

IdempotencyRecordsSchema.index(
	{
		userId: 1,
		endPoint: 1,
		key: 1,
	},
	{
		unique: true,
	},
);

exports.IdempotencyRecordsEntity = mongoose.model('IdempotencyRecordsEntity', IdempotencyRecordsSchema, 'idempotencyRecords');
