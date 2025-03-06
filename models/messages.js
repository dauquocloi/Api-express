const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
	conversation: {
		type: Schema.Types.ObjectId,
		ref: 'conversations',
	},
	sender: {
		type: Schema.Types.ObjectId,
		ref: 'users',
	},
	content: String,
	timeCreated: {
		type: Date,
		default: () => Date.now(),
	},
});

exports.MessageEntity = mongoose.model('messageEntity', messageSchema, 'messages');
