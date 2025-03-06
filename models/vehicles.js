var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a Mongoose Schema

const VehiclesSchema = new Schema({
	licensePlate: {
		type: String,
		required: true,
	},
	fromDate: {
		type: Date,
	},
	owner: {
		type: Schema.Types.ObjectId,
		ref: 'customers',
		// required: true,
	},
	image: {
		type: String,
	},
	room: {
		type: Schema.Types.ObjectId,
		ref: 'RoomsEntity',
	},
	status: {
		type: Number,
		default: 0, // 0: Đã dọn đi, 1: đang gửi, 2: tạm ngưng gửi
	},
});

exports.VehiclesEntity = mongoose.model('VehiclesEntity', VehiclesSchema, 'vehicles');
