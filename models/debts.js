var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { debtStatus, sourceType } = require('../constants/debts');
const DebtsSchema = new Schema(
	{
		content: String,
		amount: {
			type: Number,
			default: 0,
			required: true,
		},
		room: {
			type: Schema.Types.ObjectId,
			ref: 'RoomsEntity',
		},
		period: {
			month: { type: Number },
			year: { type: Number },
		},

		status: {
			type: String,
			enum: Object.values(debtStatus),
			default: 'pending',
		},
		sourceType: {
			type: String,
			enum: Object.values(sourceType),
			default: 'pending',
		},
		sourceId: {
			type: Schema.Types.ObjectId,
			default: null,
		},
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true,
	},
);

exports.DebtsEntity = mongoose.model('DebtsEntity', DebtsSchema, 'debts');
