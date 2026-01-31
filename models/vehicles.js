const { required } = require('joi');
var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { vehicleStatus } = require('../constants/vehicle');

// Create a Mongoose Schema

const VehiclesSchema = new Schema({
	licensePlate: {
		type: String,
		required: true,
	},
	fromDate: {
		type: Date,
	},
	checkoutDate: {
		type: Date,
	},
	owner: {
		type: Schema.Types.ObjectId,
		ref: 'CustomersEntity',
		required: true,
	},
	image: {
		type: String,
		default: '',
	},
	room: {
		type: Schema.Types.ObjectId,
		ref: 'RoomsEntity',
	},
	status: {
		type: String,
		enum: Object.values(vehicleStatus),
		required: true,
		default: 'active',
	},
	contract: {
		type: Schema.Types.ObjectId,
		ref: 'ContractsEntity',
	},
});

exports.VehiclesEntity = mongoose.model('VehiclesEntity', VehiclesSchema, 'vehicles');
