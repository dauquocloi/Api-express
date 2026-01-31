var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { feeUnit } = require('../constants/fees');
const initialFees = require('../utils/getListFeeInital');
const FEE_KEYS = initialFees.map((item) => item.feeKey);
const FeesSchema = new Schema(
	{
		feeName: {
			type: String,
			required: true,
		},
		feeAmount: {
			type: Number,
			required: true,
		},
		unit: {
			type: String,
			enum: Object.values(feeUnit),
			required: true,
		},
		lastIndex: {
			type: Number,
			required: function () {
				return this.unit === 'index';
			},
		},
		description: {
			type: String,
		},
		feeKey: {
			type: String,
			enum: FEE_KEYS,
			required: true,
		},
		iconPath: { type: String },
		room: {
			type: Schema.Types.ObjectId,
			ref: 'RoomsEntity',
			required: true,
		},
		version: { type: Number, default: 1 },
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

exports.FeesEntity = mongoose.model('FeesEntity', FeesSchema, 'fees');
