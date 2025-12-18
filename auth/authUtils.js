const { AuthFailureError, InternalError } = require('../AppError');
const mongoose = require('mongoose');
const JWT = require('../utils/JWT');
const { JWT: tokenInfo } = require('../config');

const getAccessToken = (authorization) => {
	if (!authorization) throw new AuthFailureError('Invalid Authorization');
	if (!authorization.startsWith('Bearer ')) throw new AuthFailureError('Invalid Authorization');
	return authorization.split(' ')[1];
};

const validateTokenData = (payload) => {
	console.log('log of payload: ', payload);
	if (
		!payload ||
		!payload.iss ||
		!payload.sub ||
		!payload.aud ||
		!payload.prm ||
		payload.iss !== tokenInfo.issuer ||
		payload.aud !== tokenInfo.audience ||
		!mongoose.Types.ObjectId.isValid(payload.sub)
	)
		throw new AuthFailureError('Invalid Access Token');
	return true;
};

const createTokens = async (userId, accessTokenKey, refreshTokenKey) => {
	try {
		const accessToken = await JWT.encode(
			new JWT.JwtPayload(tokenInfo.issuer, tokenInfo.audience, userId, accessTokenKey, tokenInfo.accessTokenValidity),
		);
		if (!accessToken) throw new InternalError();

		const refreshToken = await JWT.encode(
			new JWT.JwtPayload(tokenInfo.issuer, tokenInfo.audience, userId, refreshTokenKey, tokenInfo.refreshTokenValidity),
		);
		if (!refreshToken) throw new InternalError();

		return {
			accessToken: accessToken,
			refreshToken: refreshToken,
		};
	} catch (error) {
		throw new InternalError(error.message);
	}
};
module.exports = {
	getAccessToken,
	validateTokenData,
	createTokens,
};
