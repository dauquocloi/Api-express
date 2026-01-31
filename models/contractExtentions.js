const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContractExtentionsSchema = new Schema(
	{
		rent: { type: Number, required: true },
		depositAmount: { type: Number, required: true },
		extentionDate: { type: Date, required: true },
		status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
		contract: { type: Schema.Types.ObjectId, ref: 'ContractsEntity', required: true },
		addendum: { type: String },
		room: { type: Schema.Types.ObjectId, ref: 'RoomsEntity', required: true },
		creator: { type: Schema.Types.ObjectId, ref: 'UsersEntity', required: true },
		contractStartDate: { type: Date, required: true },
		contractEndDate: { type: Date, required: true },
	},
	{ timestamps: true },
);

exports.ContractExtentionsEntity = mongoose.model('ContractExtentionsEntity', ContractExtentionsSchema, 'contractExtentions');
