const Entity = require('../models');
const Roles = require('../constants/userRoles');
const Pipelines = require('./aggregates');

exports.findById = (userId) => {
	return Entity.UsersEntity.findById(userId);
};

exports.findUserByPhone = async (phone) => {
	return await Entity.UsersEntity.findOne({ phone: phone }).lean().exec();
};

exports.createUser = async (user, accessTokenKey, refreshTokenKey, session) => {
	const [createdUser] = await Entity.UsersEntity.create(
		[
			{
				username: user.username,
				password: user.password,
				fullName: user.fullName,
				phone: user.phone,
				role: user.role,
			},
		],
		{ session },
	);
	const [keyStore] = await Entity.KeyStoresEntity.create(
		[
			{
				user: createdUser._id,
				primaryKey: accessTokenKey,
				secondaryKey: refreshTokenKey,
			},
		],
		{ session },
	);

	return {
		user: { ...createdUser.toObject(), roles: user.roles },
		keyStore: keyStore,
	};
};

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
