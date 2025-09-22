const UseCase = require('../cores/rooms');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');
const { validateImportRoomImageSchema, validateModifyInterior } = require('../utils/validator');
const { Mongoose } = require('mongoose');

// const JWT_SECRET = '82371923sdasdads[]sdsadasd'; // this is shit

exports.getAll = (req, res, next) => {
	const data = req.params;
	console.log('This is log of rooms/getall', req.params);
	UseCase.getAll(
		data,
		(err, result) => {
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
		},
		next,
	);
};

exports.getRoom = (req, res, next) => {
	try {
		let data = req.params;
		console.log('log of data from getRoom: ', data);

		UseCase.getRoom(
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
		);
	} catch (error) {
		next(error);
	}
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

exports.update = (req, res, next) => {
	var data = req.body;
	console.log('This is log of room update req.body', req.body);
	UseCase.update(data, (err, result) => {
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

exports.finance = (req, res) => {
	var data = req.query;
	console.log('this is log of finance param', data);
	UseCase.finance(data, (err, result) => {
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

exports.importImage = (req, res, next) => {
	try {
		// const { error, value } = validateImportRoomImageSchema(req.params);

		// if (error) {
		// 	return res.status(400).send({
		// 		errorCode: 1,
		// 		data: {},
		// 		message: 'Invalid input data',
		// 		errors: error.details.map((err) => err.message),
		// 	});
		// }
		const imagesRoom = req.files;

		const data = { ...req.params, imagesRoom };
		console.log('log of data from importImage');
		UseCase.importImage(
			data,
			(err, result) => {
				if (result) {
					return res.status(201).send({
						errorCode: 0,
						data: result,
						message: 'succesfull',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(new Error(error.message));
	}
};

exports.addInterior = (req, res, next) => {
	try {
		console.log('log of addInterior: ', req.body);
		const { error, value } = validateModifyInterior(req.body);
		if (error) {
			console.log('log of error from addInterior', error);
			return res.status(400).send({
				errorCode: 1,
				data: {},
				message: 'Invalid input data',
				errors: error.details.map((err) => err.message),
			});
		}
		const data = { ...req.params, ...req.body };
		UseCase.addInterior(
			data,
			(err, result) => {
				if (result) {
					return res.status(201).send({
						errorCode: 0,
						data: result,
						message: 'succesfull',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};

exports.removeInterior = (req, res, next) => {
	try {
		const { error, value } = validateModifyInterior(req.body);
		if (error) {
			console.log('log of error from removeInterior', error);
			return res.status(400).send({
				errorCode: 1,
				data: {},
				message: 'Invalid input data',
				errors: error.details.map((err) => err.message),
			});
		}
		const data = { ...req.params, ...req.body };
		UseCase.removeInterior(
			data,
			(err, result) => {
				if (result) {
					return res.status(201).send({
						errorCode: 0,
						data: {},
						message: 'interiorRemoved',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};

exports.editInterior = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.body };
		console.log('log of data from editInterior: ', data);
		UseCase.editInterior(
			data,
			(err, result) => {
				if (result) {
					return res.status(200).send({
						errorCode: 0,
						data: {},
						message: 'interiorRemoved',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};

exports.getListSelectingRoom = (req, res, next) => {
	try {
		const data = req.params;
		console.log('log of data from getListSelectingRoom: ', data);

		UseCase.getListSelectingRoom(
			data,
			(err, result) => {
				if (result) {
					return res.status(200).send({
						errorCode: 0,
						data: result,
						message: 'successfull',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};

exports.generateDepositReceiptAndFirstInvoice = (req, res, next) => {
	try {
		const data = req.body;
		console.log('log of data from generateDepositReceiptAndFirstInvoice: ', data);

		UseCase.generateDepositReceiptAndFirstInvoice(
			data,
			(err, result) => {
				if (result) {
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
	} catch (error) {
		next(error);
	}
};

exports.generateDepositRefund = (req, res, next) => {
	try {
		const data = { ...req.body, ...req.params };
		console.log('log of data from generateDepositRefund: ', data);

		UseCase.generateDepositRefund(
			data,
			(err, result) => {
				if (result) {
					return res.status(201).send({
						errorCode: 0,
						data: result,
						message: 'created',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};

exports.getDepositRefund = (req, res, next) => {
	try {
		const data = req.params;
		console.log('log of data from getDepositRefund: ', data);

		UseCase.getDepositRefund(
			data,
			(err, result) => {
				if (result) {
					return res.status(200).send({
						errorCode: 0,
						data: result,
						message: 'successful',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};

exports.updateNoteRoom = (req, res, next) => {
	try {
		const data = { ...req.body, ...req.params };
		console.log('log of data from updateNoteRoom: ', data);
		UseCase.updateNoteRoom(
			data,
			(err, result) => {
				if (result) {
					return res.status(201).send({
						errorCode: 0,
						message: 'successful',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};
