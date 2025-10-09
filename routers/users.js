const UseCase = require('../cores/users');
const bcrypt = require('bcrypt');
const { response } = require('express');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');
const { modifyUserSchema } = require('../utils/validator');

global.config = require('../config');

exports.getAll = (req, res, next) => {
	var data = req.body;
	UseCase.getAll(data, (err, result) => {
		if (err) {
			return res.status(204).send({
				errorCode: 0,
				data: {},
				message: 'err',
				errors: [],
			});
		} else {
			return res.status(200).send({
				errorCode: 0,
				data: result,
				message: 'succesfull',
				errors: [],
			});
		}
	});
};

exports.create = (req, res, next) => {
	var data = req.body;
	console.log('this is log of req user create:', data);

	UseCase.create(data, (err, result) => {
		if (err) {
			return res.status(204).send({
				errorCode: 0,
				data: {},
				message: 'created fail',
				errors: [],
			});
		} else {
			return res.status(201).send({
				errorCode: 0,
				data: result,
				message: 'succesfull created',
				errors: [],
			});
		}
	});
};

// lấy Users by email
exports.getEmail = (req, res) => {
	var data = req.body;
	console.log('this is log off user getEmail req', data);

	UseCase.getEmail(data, (err, result) => {
		if (err) {
			return res.status(204).send({
				errorCode: 0,
				data: {},
				message: 'err',
				errors: [],
			});
		} else {
			return res.status(200).send({
				errorCode: 0,
				data: result,
				message: 'succesfull Email',
				errors: [],
			});
		}
	});
};

exports.register = async (req, res) => {
	var data = req.body;
	// mã hóa Mật Khẩu
	encryptedPassword = await bcrypt.hash(data.password, 5);
	data.password = encryptedPassword;
	console.log(data.password);
	UseCase.getEmail(data, (err, result) => {
		if (result === null) {
			UseCase.create(data, (err, result) => {
				if (err) {
					return res.status(204).send({
						errorCode: 0,
						data: {},
						message: 'created fail',
						errors: [],
					});
				} else {
					return res.status(201).send({
						errorCode: 0,
						data: result,
						message: 'succesfull created',
						errors: [],
					});
				}
			});
		} else {
			// trả về cho client
			return res.status(200).send({
				errorCode: 0,
				data: [],
				message: 'khứa này có rồi',
				errors: [],
			});
		}
	});
};

exports.login = async (req, res, next) => {
	try {
		let data = { ...req.body, ...req.cookies };
		console.log('log of data from login:', data);
		UseCase.login(
			data,
			(err, result) => {
				if (result) {
					return res.status(200).send({
						errorCode: 0,
						data: result,
						message: 'succesfull',
						errors: [],
					});
				}
			},
			next,
			res,
		);
	} catch (error) {
		next(error);
	}
};

exports.getusersdata = async (req, res) => {
	const { token } = req.body;
	console.log('this is log of getusersdata: ', token);

	try {
		const user = jwt.verify(token, config.JWT.JWT_SECRET);
		const useremail = user.email;
		console.log('this is useremail:', useremail);
		UseCase.getEmailbyToken(useremail, (err, result) => {
			if (err) {
				return res.status(204).send({
					errorCode: 0,
					data: {},
					message: 'err',
					errors: [],
				});
			} else {
				console.log('token thỏa');
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'succesfull Email',
					errors: [],
				});
			}
		});
	} catch (error) {
		return res.send({ error: error });
	}
};

exports.getUserByUserId = async (req, res) => {
	const { token } = req.body;
	console.log('this is log of getUserByuserId: ', token);

	try {
		const user = jwt.verify(token, JWT_SECRET);
		const userId = user.userid;
		console.log('this is userId:', userId);
		UseCase.getUserByUserId(useremail, (err, result) => {
			if (err) {
				return res.status(204).send({
					errorCode: 0,
					data: {},
					message: 'err',
					errors: [],
				});
			} else {
				console.log('token thỏa');
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'succesfull Email',
					errors: [],
				});
			}
		});
	} catch (error) {
		return res.send({ error: error });
	}
};

// not used
exports.getUserByFullName = async (req, res) => {
	let data = req.body;
	UseCase.getUserByFullName(data, (err, result) => {
		if (err) {
			return res.status(204).send({
				errorCode: 0,
				data: {},
				message: 'err',
				errors: [],
			});
		} else {
			return res.status(200).send({
				errorCode: 0,
				data: result,
				message: 'successfull',
				errors: [],
			});
		}
	});
};

exports.modifyPassword = async (req, res, next) => {
	let data = { ...req.body, ...req.params };

	UseCase.modifyPassword(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					message: 'Change password success',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.modifyUserInfo = async (req, res, next) => {
	let data = { ...req.body, ...req.params };
	const { error } = modifyUserSchema(data);
	UseCase.modifyUserInfo(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'modify user successfull',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.getAllManagers = async (req, res, next) => {
	let data = req.user;
	// const { error } = modifyUserSchema(data);
	console.log('log of data from getAllManagers: ', data);
	UseCase.getAllManagers(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'success',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.removeManager = async (req, res, next) => {
	let data = req.params;
	console.log('log of data from removeManager: ', data);
	UseCase.removeManager(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'success',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.getAllManagement = async (req, res, next) => {
	let data = req.user;

	console.log('log of data from getAllManagement: ', data);
	UseCase.getAllManagement(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'success',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.createManager = async (req, res, next) => {
	let data = { ...req.body, ...req.params };
	// const { error } = modifyUserSchema(data);
	console.log('log of data from createManager: ', data);
	UseCase.createManager(
		data,
		(err, result) => {
			if (!err) {
				return res.status(201).send({
					errorCode: 0,
					data: result,
					message: 'successfull',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.modifyUserPermission = async (req, res, next) => {
	let data = { ...req.body, ...req.params };
	console.log('log of data from modifyUserPermission: ', data);
	UseCase.modifyUserPermission(
		data,
		(err, result) => {
			if (result) {
				return res.status(200).send({
					errorCode: 0,
					message: 'success',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.checkManagerCollectedCash = async (req, res, next) => {
	let data = req.params;
	console.log('log of data from checkManagerCollectedCash: ', data);
	UseCase.checkManagerCollectedCash(
		data,
		(err, result) => {
			if (result) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'success',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.changeUserBuildingManagement = async (req, res, next) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from changeUserBuildingManagement: ', data);
	UseCase.changeUserBuildingManagement(
		data,
		(err, result) => {
			if (result) {
				return res.status(200).send({
					errorCode: 0,
					message: 'success',
					errors: [],
				});
			}
		},
		next,
	);
};
