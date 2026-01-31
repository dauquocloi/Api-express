const Entity = require('../models');
const Roles = require('../constants/userRoles');
const Pipelines = require('./aggregates');
const { NotFoundError } = require('../AppError');

exports.findById = (userId) => {
	return Entity.UsersEntity.findById(userId);
};

exports.findUserByPhone = async (phone, session) => {
	let query = Entity.UsersEntity.findOne({ phone: phone });
	if (session) query.session(session);
	return await query.lean().exec();
};

// exports.createUser = async (user, accessTokenKey, refreshTokenKey, session) => {
// 	const [createdUser] = await Entity.UsersEntity.create(
// 		[
// 			{
// 				username: user.username,
// 				password: user.password,
// 				fullName: user.fullName,
// 				phone: user.phone,
// 				role: user.role,
// 			},
// 		],
// 		{ session },
// 	);
// 	const [keyStore] = await Entity.KeyStoresEntity.create(
// 		[
// 			{
// 				user: createdUser._id,
// 				primaryKey: accessTokenKey,
// 				secondaryKey: refreshTokenKey,
// 			},
// 		],
// 		{ session },
// 	);

// 	return {
// 		user: { ...createdUser.toObject(), roles: user.roles },
// 		keyStore: keyStore,
// 	};
// };

// Admin only
exports.getAllUsers = async () => {
	return await Entity.UsersEntity.find({}).lean().exec();
};

exports.getAllManagements = async (userObjectId) => {
	const [result] = await Entity.UsersEntity.aggregate(Pipelines.users.getAllManagements(userObjectId));
	return result;
};

exports.getListSelectionManagements = async (userObjectId) => {
	const [listSelectionManagements] = await Entity.BuildingsEntity.aggregate(Pipelines.users.getListSelectionManagements(userObjectId));
	if (!listSelectionManagements) return [];
	return listSelectionManagements.listManagements;
};

exports.findUserByIds = (userIds) => {
	return Entity.UsersEntity.find({ _id: { $in: userIds } });
};

// this for generate owner
exports.importUser = async ({ username, role, fullName, password, permanentAddress, phone, dob, cccd, cccdIssueDate, cccdIssueAt }, session) => {
	const [result] = await Entity.UsersEntity.create(
		[
			{
				username: username,
				role: role,
				fullName: fullName,
				password: password,
				permanentAddress: permanentAddress,
				phone: phone,
				birthdate: dob,
				cccd: cccd,
				cccdIssueDate: cccdIssueDate,
				cccdIssueAt: cccdIssueAt,
			},
		],
		{ session },
	);

	return result.toObject();
};

exports.createManagement = async (
	{ fullName, phone, dob, cccd, cccdIssueDate, cccdIssueAt, permanentAddress, role, gender, password, username },
	session,
) => {
	const [result] = await Entity.UsersEntity.create(
		[
			{
				fullName: fullName,
				phone: phone,
				birthdate: dob,
				cccd: cccd,
				cccdIssueDate: cccdIssueDate,
				cccdIssueAt: cccdIssueAt,
				permanentAddress: permanentAddress,
				role: role,
				gender,
				username: username,
				password: password,
			},
		],
		{ session },
	);
	return result.toObject();
};

exports.modifyManagementInfo = async (
	{ fullName, phone, dob, cccd, cccdIssueDate, cccdIssueAt, permanentAddress, gender, role },
	userId,
	session,
) => {
	const result = await Entity.UsersEntity.findOneAndUpdate(
		{ _id: userId },
		{
			$set: {
				fullName: fullName,
				phone: phone,
				birthdate: dob,
				cccd: cccd,
				cccdIssueDate: cccdIssueDate,
				cccdIssueAt: cccdIssueAt,
				permanentAddress: permanentAddress,
				role: role,
				gender: gender,
			},
		},
		{ session, new: true },
	);
	if (!result) throw new NotFoundError('User not found');
	return result;
};

exports.setNotificationSetting = async (userId, notificationSettingId, session) => {
	const result = await Entity.UsersEntity.findOneAndUpdate({ _id: userId }, { notificationSetting: notificationSettingId }, { session });
	if (!result) throw new NotFoundError('User not found');
	return true;
};

exports.addDevice = async (userId, deviceId, platform, expoPushToken) => {
	const result = await Entity.UsersEntity.findOneAndUpdate(
		{ _id: userId },
		{
			$set: {
				deviceId,
				platform,
				expoPushToken,
			},
		},
		{ new: true },
	);
	if (!result) throw new NotFoundError('User not found');
	return true;
};
