var mongoose = require('mongoose');
const Entity = require('./index');
const Schema = mongoose.Schema;
// Create a Mongoose Schema

const InteriorsSchema = new Schema({
	interiorName: {
		type: String,
		required: true,
	},
	quantity: {
		type: Number,
		required: true,
	},
	interiorCode: {
		type: String,
		unique: true,
	},
});

const RoomsSchema = new Schema({
	roomIndex: {
		type: Number,
		required: true,
	},
	roomPrice: Number,
	roomDeposit: Number,
	roomTypes: String,
	roomAcreage: Number,

	roomState: {
		type: Number,
		default: 0,
		required: true,
		// 0 - trống
		// 1 - đang ở
		// 2 - sắp trả phòng
	},

	service: {
		type: Schema.Types.ObjectId,
		ref: 'ServicesEntity',
	},

	building: {
		type: Schema.Types.ObjectId,
		ref: 'BuildingsEntity',
	},

	payment: {
		type: Schema.Types.ObjectId,
		ref: 'PaymentsEntity',
	},
	interior: [InteriorsSchema],
});

// RoomsSchema.pre('save', async function (next) {
// 	const serviceId = this.service;
// 	let foundService;
// 	try {
// 		const foundService = await Entity.ServicesEntity.findById(serviceId).exec();

// 		if (!foundService) {
// 			const error = new Error('Không tìm thấy dữ liệu service với id đã cung cấp.');
// 			return next(error);
// 		}
// 		// elecprice when create room
// 		console.log('log found id 1:', foundService);
// 		this.elecprice = (this.lastelecnumber - this.firstelecnumber) * foundService.electric;
// 		console.log(this.elecprice);
// 		next();
// 	} catch (err) {
// 		next(err);
// 	}
// });

exports.RoomsEntity = mongoose.model('RoomsEntity', RoomsSchema, 'rooms');
// Register the room schema
