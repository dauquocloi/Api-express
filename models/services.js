var mongoose = require('mongoose');
// const { any } = require('underscore');
const Schema = mongoose.Schema;

const ServicesSchema = new Schema({
	room: {
		type: Schema.Types.ObjectId,
		ref: 'RoomsEntity',
	},
	electric: { type: Number, default: 3500 },
	water: { type: Number, default: 100000 },
	waterindex: { type: Number, default: 23000 },
	motobike: { type: Number, default: 150000 },
	elevator: { type: Number, default: 50000 },
	generalservice: Number,
});

exports.ServicesEntity = mongoose.model('ServicesEntity', ServicesSchema, 'services');
