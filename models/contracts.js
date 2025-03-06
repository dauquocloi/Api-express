var mongoose = require('mongoose');
// const { any } = require('underscore');
const Schema = mongoose.Schema;

const ContractsSchema = new Schema({
	nameContractOwner: String,
	rent: {
		type: Number,
		required: true,
	},
	deposit: {
		type: Number,
		required: true,
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'UsersEntity',
	},
	contractSignDate: {
		type: Date,
		default: () => Date.now(),
		required: true,
	},
	room: {
		type: Schema.Types.ObjectId,
		ref: 'RoomsEntity',
		required: true,
	},
	contractEndDate: {
		type: Date,
		required: true,
	},
	contractTerm: {
		type: String,
		required: true,
	},
	note: String,
});

// Register the room schema
exports.ContractsEntity = mongoose.model('ContractsEntity', ContractsSchema, 'contracts');
