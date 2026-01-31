const express = require('express');
const { AuthFailureError, ForbiddenError } = require('../AppError');
const asyncHandler = require('../utils/asyncHandler');
const Services = require('../service');
const ROLES = require('../constants/userRoles');

const authorization = (...allowedRoles) => {
	return asyncHandler(async (req, res, next) => {
		if (!req.user || !req.user.role) throw new ForbiddenError('Không có quyền truy cập');
		if (req.user.role === ROLES['ADMIN']) return next();
		if (!allowedRoles.includes(req.user.role)) {
			throw new ForbiddenError('Không có quyền truy cập');
		}

		return next();
	});
};

module.exports = authorization;
