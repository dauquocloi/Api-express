const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
var DataProvider = require('./conversations');
const jwt = require('jsonwebtoken');

const { getIO } = require('../utils/SocketConnect');
// const io = getIO();

const createMessage = (prop) => {
	let { senderMessage, message, conversation } = prop;
	MongoConnect.Connect(config.database.fullname).then(() => {
		try {
			Entity.MessageEntity.create({
				sender: senderMessage,
				content: message,
				conversation,
			});
		} catch (error) {
			console.log(error);
			throw error;
		}
	});
};

exports.getAllMessagesByUserId = (data, cb) => {
	var userId = new mongoose.Types.ObjectId(`${data.userId}`);
	console.log('this is log of userId of getAllMessagesByUserId at data_provider:', userId);
	MongoConnect.Connect(config.database.fullname)
		.then((db) => {
			// do things here
			Entity.ConversationEntity.aggregate(
				[
					{
						$match: {
							'participants.users': userId,
						},
					},
					{
						$project: {
							participants: 1,
							event: 1,
						},
					},
					{
						$lookup: {
							from: 'messages',
							localField: '_id',
							foreignField: 'conversation',
							as: 'message',
						},
					},
					{ $unwind: '$message' },
					{
						$lookup: {
							from: 'users',
							localField: 'participants.users',
							foreignField: '_id',
							as: 'usersInfo',
						},
					},
				],
				cb,
			);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.newMessage = (data, cb) => {
	const { messageContent, senderId, conversationId } = data.params;
	const sender = new mongoose.Types.ObjectId(`${senderId}`);

	MongoConnect.Connect(config.database.fullname)
		.then((db) => {
			Entity.MessageEntity.create(
				{
					sender,
					content: messageContent,
					conversation: conversationId,
				},
				cb,
			);
		})
		.catch((error) => {
			console.log(error);
		});
};

exports.testCreateMessage = (data, cb) => {
	console.log(data);

	for (var i = 0; i <= 5; i++) {
		let messageInfo = {
			conversation: new mongoose.Types.ObjectId('66d5c28b31d8bbca407258a5'),
			content: `tin nhắn thứ ${i}`,
			sender: new mongoose.Types.ObjectId('6639ccbdb6e895454cd97d5f'),
		};
		createMessage(messageInfo);
	}
	cb('create messages successfully');
};

exports.getAllInfoByTextInput = (data, cb) => {
	let { query, token } = data;
	let verifyToken = jwt.verify(token, config.JWT.JWT_SECRET);
	let userId = verifyToken.userId;
	new mongoose.Types.ObjectId(userId);
	console.log('this is log of request sender Id', userId);
	MongoConnect.Connect(config.database.fullname).then((db) => {
		Entity.CustomersEntity.aggregate(
			[
				{
					$facet: {
						unContact: [
							{
								$match: {
									phone: query,
								},
							},
						],
						contactInfo: [
							{
								$match: {
									'contacts.user': userId,
								},
							},
							{
								$lookup: {
									from: 'rooms',
									localField: 'room',
									foreignField: '_id',
									as: 'roomInfo',
								},
							},
							{
								$unwind: {
									path: '$roomInfo',
								},
							},
							{
								$match: {
									$or: [
										{
											fullname: {
												$regex: query,
											},
										},
										{
											'roomInfo.roomindex': {
												$regex: query,
											},
										},
									],
								},
							},
						],
						grChatName: [
							{
								$match: {
									// request sender _id
									_id: new mongoose.Types.ObjectId('6639ccbdb6e895454cd97d5f'),
								},
							},
							{
								$lookup: {
									from: 'conversations',
									let: {
										customerId: '_id',
									},
									pipeline: [
										{
											$match: {
												grChatName: {
													$regex: query,
												},
											},
										},
									],
									as: 'converInfo',
								},
							},
							{
								$project: {
									'converInfo.grChatName': 1,
									'converInfo._id': 1,
								},
							},
						],
						messageInfo: [
							{
								$match: {
									_id: userId,
								},
							},
							{
								$lookup: {
									from: 'conversations',
									localField: '_id',
									foreignField: 'participants.users',
									as: 'converInfo',
								},
							},
							{
								$unwind: {
									path: '$converInfo',
								},
							},
							{
								$lookup: {
									from: 'messages',
									localField: 'converInfo._id',
									foreignField: 'conversation',
									as: 'messageInfo',
								},
							},
							{
								$unwind: {
									path: '$messageInfo',
									preserveNullAndEmptyArrays: true,
								},
							},
							// $match trường grName and content
							{
								$match: {
									'messageInfo.content': {
										$regex: query,
									},
								},
							},
							// group các content có chung 1 conversation
							{
								$group: {
									_id: {
										converOfMessage: '$messageInfo.conversation',
									},
									content: {
										$push: {
											message_id: '$messageInfo._id',
											sender: '$messageInfo.sender',
											content: '$messageInfo.content',
											timeCreated: '$messageInfo.timeCreated',
										},
									},
								},
							},
							{
								$lookup: {
									from: 'conversations',
									localField: '_id.converOfMessage',
									foreignField: '_id',
									as: 'converInfo',
								},
							},
							{
								$unwind: {
									path: '$converInfo',
									preserveNullAndEmptyArrays: true,
								},
							},
							{
								$set: {
									customerInfo: {
										$filter: {
											input: '$converInfo.participants',
											as: 'message_id',
											cond: {
												$and: [
													{
														$lt: [
															{
																$size: '$converInfo.participants',
															},
															3,
														],
													},
													{
														$ne: ['$$message_id.users', userId],
													},
												],
											},
										},
									},
								},
							},
							{
								$lookup: {
									from: 'users',
									localField: 'customerInfo.users',
									foreignField: '_id',
									as: 'userInfo',
								},
							},
						],
					},
				},
			],
			cb,
		);
	});
};

exports.getMessagesByConversationId = (data, cb) => {
	const conversationId = new mongoose.Types.ObjectId(data.conversationId);
	const PAGE_NUMBER = Number(data.page) - 1;
	const PAGE_SIZE = 20;
	console.log(PAGE_NUMBER);

	MongoConnect.Connect(config.database.fullname)
		.then((db) => {
			Entity.MessageEntity.find({ conversation: conversationId })
				.skip(PAGE_NUMBER * PAGE_SIZE)
				.limit(PAGE_SIZE)
				.exec((error, messages) => {
					if (error) {
						return cb(error);
					}
					cb(null, messages);
				});
		})
		.catch((error) => {
			throw error;
			cb(error);
		});
};
