const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');

exports.createConversation = ({ data }) => {
	// const firstUserId = mongoose.Types.ObjectId(`${firstUser}`)

	MongoConnect.Connect(config.database.fullname).then(() => {
		Entity.ConversationEntity.create({});
	});
};

exports.getAll = (data, cb) => {
	const { userId } = data;

	const _id = mongoose.Types.ObjectId(userId);
	MongoConnect.Connect(config.database.fullname).then(() => {
		Entity.ConversationEntity.aggregate(
			[
				{
					$match: {
						'participants.users': _id,
					},
				},
				{
					$lookup: {
						from: 'messages',
						let: {
							conversationId: '$_id',
						},
						pipeline: [
							{
								$match: {
									$expr: {
										$eq: ['$conversation', '$$conversationId'],
									},
								},
							},
							{
								$sort: {
									timeCreated: -1,
								},
							},
							{
								$limit: 1,
							},
						],
						as: 'messagesInfo',
					},
				},
				{
					$set: {
						nonGrChat: {
							$cond: {
								if: {
									$eq: ['$isGroupChat', false],
								},
								then: '$participants',
								else: [],
							},
						},
					},
				},
				{
					$lookup: {
						from: 'users',
						let: {
							nonGrChat: '$nonGrChat.users',
						},
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{
												$in: ['$_id', '$$nonGrChat'],
											},
											{
												$ne: ['$_id', _id],
											},
										],
									},
								},
							},
						],
						as: 'contactInfo',
					},
				},
				{
					$lookup: {
						from: 'rooms',
						localField: 'contactInfo.room',
						foreignField: '_id',
						as: 'roomInfo',
					},
				},
				{
					$group: {
						// sender request Id
						_id: _id,
						converInfo: {
							$push: {
								_id: '$_id',
								grChatName: '$grChatName',
								isGroupChat: '$isGroupChat',
								roomInfo: '$roomInfo.roomindex',
								contactInfo: '$contactInfo',
								messagesInfo: '$messagesInfo',
							},
						},
					},
				},
			],
			cb,
		);
	});
};
