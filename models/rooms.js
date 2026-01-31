const mongoose = require('mongoose');
const Entity = require('./index');
const Schema = mongoose.Schema;
const getFileUrl = require('../utils/getFileUrl');
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
	interiorRentalDate: {
		type: Date,
		default: Date.now,
	},
});

const RoomsSchema = new Schema({
	roomIndex: {
		type: String,
		required: true,
		trim: true,
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

	isDeposited: {
		type: Boolean,
		default: false,
	},

	//Nên tham triếu đến depositRefunds
	isRefundDeposit: {
		//Trạng thái đang chờ trả cọc.
		type: Boolean,
		default: false,
	},
	building: {
		type: Schema.Types.ObjectId,
		ref: 'BuildingsEntity',
	},

	interior: [InteriorsSchema],

	roomImage: {
		ref: [{ type: String }],
		lastUpload: { type: Date, default: Date.now },
	},
	// Should be in the Contracts
	note: {
		type: String,
		default: '',
	},
	version: { type: Number, default: 1, required: true },
	writeLock: {
		ownerId: { type: Schema.Types.ObjectId, ref: 'UsersEntity' },
		locked: { type: Boolean, default: false },
		expAt: { type: Date },
		reason: { type: String, default: '' },
		lockedAt: { type: Date },
	},
});

RoomsSchema.post('aggregate', async function (docs, next) {
	try {
		if (docs[0]?.roomImage != undefined && docs.length > 0) {
			const { roomImage } = docs[0];
			const roomImageUrl = [];
			for (const key of roomImage.ref) {
				const signalUrl = await getFileUrl(key);
				roomImageUrl.push(signalUrl);
			}
			console.log(roomImageUrl);

			if (docs[0].roomImage) {
				docs[0].roomImage.ref = roomImageUrl; // Gán an toàn
			}

			next();
		} else {
			next();
		}
	} catch (error) {
		next(error);
	}
});

exports.RoomsEntity = mongoose.model('RoomsEntity', RoomsSchema, 'rooms');
// Register the room schema
