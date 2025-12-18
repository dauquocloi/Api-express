const express = require('express');
const mongoose = require('mongoose');
const asyncHandler = require('../../utils/asyncHandler');
const { InvalidInputError, AuthFailureError } = require('../../AppError');
const bcrypt = require('bcrypt');
const { SuccessResponse } = require('../../utils/apiResponse');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const crypto = require('crypto');
const { createTokens } = require('../../auth/authUtils');
const Services = require('../../service');

const router = express.Router();

router.use(
	'/refresh',
	validator(schema.auth, ValidateSource.HEADER),
	validator(schema.refreshToken),
	asyncHandler(async (req, res) => {
		req.accessToken = getAccessToken(req.headers.authorization); // Express headers are auto converted to lowercase

		const accessTokenPayload = await JWT.decode(req.accessToken);
		validateTokenData(accessTokenPayload);

		const user = await UserRepo.findById(new Types.ObjectId(accessTokenPayload.sub));
		if (!user) throw new AuthFailureError('User not registered');
		req.user = user;

		const refreshTokenPayload = await JWT.validate(req.body.refreshToken);
		validateTokenData(refreshTokenPayload);

		if (accessTokenPayload.sub !== refreshTokenPayload.sub) throw new AuthFailureError('Invalid access token');

		const keystore = await KeystoreRepo.find(req.user, accessTokenPayload.prm, refreshTokenPayload.prm);
		if (!keystore) throw new AuthFailureError('Invalid access token');

		// await KeystoreRepo.remove(keystore._id);

		const accessTokenKey = crypto.randomBytes(64).toString('hex');
		const refreshTokenKey = crypto.randomBytes(64).toString('hex');

		// await KeystoreRepo.create(req.user, accessTokenKey, refreshTokenKey);
		const tokens = await createTokens(req.user, accessTokenKey, refreshTokenKey);

		new TokenRefreshResponse('Token Issued', tokens.accessToken, tokens.refreshToken).send(res);
	}),
);
