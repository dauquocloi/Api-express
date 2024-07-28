const UseCase = require('../cores/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');

const JWT_SECRET = '82371923sdasdads[]sdsadasd';

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
	console.log(data);

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
		if (result.data === null) {
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
	// Bắt data ở đây khi gọi api sẽ xuất hiện
	UseCase.getEmail(data, async (err, result) => {
		if (result.data == null) {
			return res.status(204).send({
				errorCode: 0,
				message: 'Khứa này không có',
				errors: [],
			});
		}
		// nếu thỏa email
		// -> So sánh mật khẩu
		var sosanh = await bcrypt.compare(data.password, result.data.password);

		if (sosanh == true) {
			console.log('Mật khẩu trùng khớp');
			//  mã hóa email
			const token = jwt.sign({ email: result.data.email }, JWT_SECRET);
			return res.status(200).send({
				errorCode: 0,
				message: 'Mật khẩu trùng khớp',
				errors: [],
				data: token,
				userType: result.data.userType,
			});
		} else sosanh == false;
		{
			console.log('Mật khẩu không trùng khớp');
			return res.status(401).send({
				errorCode: 2,
				message: 'Mật khẩu không trùng khớp',
				errors: [],
			});
		}
	});
};

exports.getusersdata = async (req, res) => {
	const { token } = req.body;
	console.log('this is log of getusersdata: ', token);
	console.log('this is log of NULL: ');

	try {
		const user = jwt.verify(token, JWT_SECRET);
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
