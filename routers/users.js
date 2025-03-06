const UseCase = require('../cores/users');
const bcrypt = require('bcrypt');
const { response } = require('express');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');

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

// API Login
exports.login = async (req, res) => {
	var data = req.body;
	UseCase.getEmail(data, async (err, result) => {
		console.log(result);
		if (!result) {
			return res.status(200).json({
				errorCode: 0,
				message: 'Khứa này không có',
				errors: [],
				data: {},
			});
		}

		// nếu thỏa email
		// -> So sánh mật khẩu
		var sosanh = await bcrypt.compare(data.params?.password, result.password);

		if (sosanh == true) {
			console.log('Mật khẩu trùng khớp: ', result.userType);
			//  mã hóa email
			const token = jwt.sign({ email: result.email, userId: result._id }, config.JWT.JWT_SECRET);
			const { fullname, phone, email, _id, userType } = result;

			return res.status(200).send({
				errorCode: 0,
				message: 'Mật khẩu trùng khớp',
				errors: [],
				data: { token, fullname, phone, email, _id, userType },
			});
		} else {
			console.log('Mật khẩu không trùng khớp');
			return res.status(401).send({
				errorCode: 2,
				message: 'Mật khẩu không trùng khớp',
				errors: [],
				data: {},
			});
		}
	});
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
				message: 'succesfull',
				errors: [],
			});
		}
	});
};
