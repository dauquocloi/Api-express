var mongoose = require('mongoose');
// const { any } = require('underscore');
const Schema = mongoose.Schema;
const Entity = require('./index');

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
		enum: ['person', 'index', 'vehicle', 'room'],
		required: true,
	},
	description: {
		type: String,
	},
	room: {
		type: Schema.Types.ObjectId,
		ref: 'RoomsEntity',
		required: true,
	},
});

exports.FeesEntity = mongoose.model('FeesEntity', FeesSchema, 'fees');
