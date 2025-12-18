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
		ref: 'customers',
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
		default: 'active', // 0: Đã dọn đi, 1: đang gửi, 2: tạm ngưng gửi
	},
});

exports.VehiclesEntity = mongoose.model('VehiclesEntity', VehiclesSchema, 'vehicles');
