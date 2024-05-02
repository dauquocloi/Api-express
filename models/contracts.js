var mongoose = require('mongoose');
// const { any } = require('underscore');
const Schema = mongoose.Schema;

const ContractsSchema = new Schema({
	namecontractowner: String,
	building: {
		type: Schema.Types.ObjectId,
		ref: 'BuildingEntity',
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'UsersEntity',
	},
	contractsigndate: {
		type: Date,
		default: () => Date.now(),
	},
	room: {
		type: Schema.Types.ObjectId,
		ref: 'RoomsEntity',
	},
	contractenddate: Date,
});

// Register the room schema
exports.ContractsEntity = mongoose.model('ContractsEntity', ContractsSchema, 'contracts');
