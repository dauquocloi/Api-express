const express = require('express');
const mongoose = require('mongoose');
const asyncHandler = require('../../utils/asyncHandler');
const { InvalidInputError, BadRequestError } = require('../../AppError');
const bcrypt = require('bcrypt');
const { validator } = require('../../utils/validator');
const schema = require('./schema');
const crypto = require('crypto');
const { createTokens } = require('../../auth/authUtils');
const Services = require('../../service');

const router = express.Router();

router.post(
	'/basic',
	validator(schema.signup),
	asyncHandler(async (req, res) => {
		const user = await Services.users.findUserByPhone(req.body.userName);
		if (user) throw new BadRequestError('User already registered');

		const accessTokenKey = crypto.randomBytes(64).toString('hex');
		const refreshTokenKey = crypto.randomBytes(64).toString('hex');
		const passwordHash = await bcrypt.hash(req.body.password, 10);

		const tokens = await createTokens(user, accessTokenKey, refreshTokenKey);
	}),
);
