const express = require('express');
const { InvalidInputError, AuthFailureError } = require('../../AppError');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { createTokens } = require('../../auth/authUtils');
const Services = require('../../service');

exports.login = async ({ userName, password }) => {
	const user = await Services.users.findUserByPhone(userName).lean().exec();
	console.log('log of user from login: ', user);
	if (!user) throw new InvalidInputError('Sai tài khoản hoặc mật khẩu');
	if (!user.password) throw new InvalidInputError('Sai tài khoản hoặc mật khẩu');

	const match = await bcrypt.compare(password, user.password);
	if (!match) throw new AuthFailureError('Đăng nhập thất bại. Sai tài khoản hoặc mật khẩu');

	const accessTokenKey = crypto.randomBytes(64).toString('hex');
	const refreshTokenKey = crypto.randomBytes(64).toString('hex');

	const keyStore = await Services.keyStores.create(user._id, accessTokenKey, refreshTokenKey);
	console.log('log of keyStore from login: ', keyStore);
	const tokens = await createTokens(user._id, accessTokenKey, refreshTokenKey);

	return {
		user: {
			_id: user._id,
			fullName: user.fullName,
			phone: user.phone,
			role: user.role,
			avatar: user.avatar,
			notificationSetting: user.notificationSetting,
			cccd: user.cccd,
			cccdIssueDate: user.cccdIssueDate,
			cccdIssueAt: user.cccdIssueAt,
			permanentAddress: user.permanentAddress,
			gender: user.gender,
			dob: user.birthdate,
		},
		tokens: tokens,
	};
};
