var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conversationSchema = new Schema({
	participants: [
		{
			user: {
				type: Schema.Types.ObjectId,
				ref: 'users',
			},
			permission: String,
		},
	],
	isGroupChat: Boolean,
});

exports.ConversationEntity = mongoose.model('conversationEntity', conversationSchema, 'conversations');
