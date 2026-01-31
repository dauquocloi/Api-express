const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { CUSTOMER_FROM } = require('../constants/customers');
const { feeUnit } = require('../constants/fees');

const InteriorsSchema = new Schema({
	interiorName: {
		type: String,
		required: true,
	},
	quantity: {
		type: Number,
		required: true,
	},
	interiorRentalDate: {
		type: Date,
		default: Date.now,
	},
});

const FeesSchema = new Schema({
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
	iconPath: { type: String },
	feeKey: { type: String },
});

const RoomHistoriesEntity = new Schema({
	contract: {
		contractId: { type: Schema.Types.ObjectId, ref: 'ContractsEntity' },
		contractCode: { type: String },
		depositAmount: { type: Number },
		contractSignDate: { type: Date },
		contractEndDate: { type: Date },
	},
	room: { type: Schema.Types.ObjectId, ref: 'RoomsEntity' },
	checkoutDate: { type: Date, default: Date.now },
	customerFrom: { type: String, enum: Object.values(CUSTOMER_FROM), default: CUSTOMER_FROM['UNKNOWN'] },
	checkoutType: { type: String, enum: ['depositRefund', 'checkoutEarly'] },
	checkoutCost: { type: Schema.Types.ObjectId, ref: 'CheckoutCostsEntity', default: null },
	depositRefund: { type: Schema.Types.ObjectId, ref: 'DepositRefundsEntity', default: null },
	interiors: [InteriorsSchema],
	fees: [FeesSchema],
	rent: { type: Number, required: true },
});

exports.RoomHistoriesEntity = mongoose.model('RoomHistoriesEntity', RoomHistoriesEntity, 'roomHistories');
