const Entity = require('../models');

const create = async (user, primary, secoundary, session) => {
	const [keyStore] = await Entity.KeyStoresEntity.create(
		[
			{
				user: user,
				primaryKey: primary,
				secondaryKey: secoundary,
			},
		],
		{ session },
	);

	return keyStore.toObject();
};

const findKey = async (userId, key) => {
	return await Entity.KeyStoresEntity.findOne({ user: userId, primaryKey: key, status: true }).lean().exec();
};

const remove = async (keyStoreId) => {
	return await Entity.KeyStoresEntity.deleteOne({ _id: keyStoreId });
};

module.exports = { create, findKey, remove };
