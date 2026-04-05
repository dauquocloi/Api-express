const entity = require('../models/OA');

const getOAInfo = (provider) => entity.OATokensEntity.findOne({ provider });

const updateOAInfo = async ({ provider, oaId, accessToken, refreshToken, expiresIn }) => {
	const result = await entity.OATokensEntity.findOneAndUpdate(
		{ provider },
		{
			provider,
			accessToken,
			refreshToken,
			expiresIn,
			oaId,
		},
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	);

	return result;
};

module.exports = {
	getOAInfo,
	updateOAInfo,
};
