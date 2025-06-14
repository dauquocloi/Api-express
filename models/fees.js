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
		required: true,
	},
	iconPath: { type: String },
	room: {
		type: Schema.Types.ObjectId,
		ref: 'RoomsEntity',
		required: true,
	},
});

exports.FeesEntity = mongoose.model('FeesEntity', FeesSchema, 'fees');
