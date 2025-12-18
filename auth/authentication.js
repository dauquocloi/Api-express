const express = require('express');
const { TokenExpiredError, AuthFailureError, ForbiddenError, AccessTokenError } = require('../AppError');
const mongoose = require('mongoose');
const schema = require('./schema');
const { validator, ValidateSource } = require('../utils/validator');
const asyncHandler = require('../utils/asyncHandler');
const { getAccessToken, validateTokenData } = require('./authUtils');
const JWT = require('../utils/JWT');
const Services = require('../service');
const router = express.Router();

router.use(
	validator(schema.auth, ValidateSource.HEADER),
	asyncHandler(async (req, res, next) => {
		req.accessToken = getAccessToken(req.headers.authorization); // Express headers are auto converted to lowercase
		try {
			const payload = await JWT.validate(req.accessToken);
			validateTokenData(payload);

			const user = await Services.users.findUserById(new mongoose.Types.ObjectId(payload.sub));
			if (!user) throw new AuthFailureError('User not registered');
			req.user = user;

			const keyStore = await Services.keyStores.findKey(req.user, payload.prm);
			if (!keyStore) throw new AuthFailureError('Invalid access token');
			req.keyStore = keyStore;

			return next();
		} catch (e) {
			if (e instanceof TokenExpiredError) throw new AccessTokenError(e.message);
			throw e;
		}
	}),
);

module.exports = router;
