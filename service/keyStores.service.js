const Entity = require('../models');

const create = async (user, primary, secoundary) => {
	const keyStore = await Entity.KeyStoresEntity.create({
		user: user,
		primaryKey: primary,
		secondaryKey: secoundary,
	});
	return keyStore.toObject();
};

const findKey = async (userId, key) => {
	return await Entity.KeyStoresEntity.findOne({ user: userId, primaryKey: key, status: true }).lean().exec();
};

module.exports = { create, findKey };
