var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DebtsSchema = new Schema({
	content: String,
	amount: {
		type: Number,
		default: 0,
		required: true,
	},
	room: {
		type: Schema.Types.ObjectId,
		ref: 'RoomsEntity',
	},
	status: {
		type: String,
		enum: ['pending', 'paid'],
		default: 'pending',
	}, // Trạng thái nợ
});
