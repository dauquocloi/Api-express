const UseCase = require('../cores/messages');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');

exports.getAllMessagesByUserId = (req, res) => {
	var data = req.body;
	console.log('this is log of req getAllMessagesByUserId: ', data);
	UseCase.getAllMessagesByUserId(data, (err, result) => {
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

exports.newMessage = (req, res) => {
	var data = req.body;
	console.log('this is log of req.param newMessage: ', data);
	UseCase.newMessage(data, (err, result) => {
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

exports.testCreateMessage = (req, res) => {
	var data = req.body;
	console.log('this is log of req.body testCreateMessage: ', data);
	UseCase.testCreateMessage(data, (err, result) => {
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

exports.getAllInfoByTextInput = (req, res) => {
	var data = req.query;
	console.log('this is log of req.param getAllInfoByTextInput', data.query);
	UseCase.getAllInfoByTextInput(data, (err, result) => {
		console.log(result);
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
				message: 'succesful',
				errors: [],
			});
		}
	});
};

exports.getMessagesByConversationId = (req, res) => {
	var data = req.query;
	console.log('this is log of req.param getAllMessagesByConversationId', data);
	UseCase.getMessagesByConversationId(data, (err, result) => {
		console.log(result);
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
				message: 'succesful',
				errors: [],
			});
		}
	});
};
