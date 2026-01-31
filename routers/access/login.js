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

router.post(
	'/basic',
	validator(schema.credential, ValidateSource.BODY),
	asyncHandler(async (req, res) => {
		const user = await Services.users.findUserByPhone(req.body.userName);
		if (!user) throw new InvalidInputError('Sai tài khoản hoặc mật khẩu');
		if (!user.password) throw new InvalidInputError('Sai tài khoản hoặc mật khẩu');

		const match = await bcrypt.compare(req.body.password, user.password);
		if (!match) throw new AuthFailureError('Đăng nhập thất bại. Sai tài khoản hoặc mật khẩu');

		const accessTokenKey = crypto.randomBytes(64).toString('hex');
		const refreshTokenKey = crypto.randomBytes(64).toString('hex');

		const keyStore = await Services.keyStores.create(user._id, accessTokenKey, refreshTokenKey);
		const tokens = await createTokens(user._id, accessTokenKey, refreshTokenKey);

		console.log('user from login: ', user);
		return new SuccessResponse('Login Success', {
			user: {
				_id: user._id,
				fullName: user.fullName,
				phone: user.phone,
				role: user.role,
				avatar: user.avatar,
			},
			tokens: tokens,
		}).send(res);
	}),
);

module.exports = router;
