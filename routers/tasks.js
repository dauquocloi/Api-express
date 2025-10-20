const UseCase = require('../cores/tasks');

exports.createTask = async (req, res, next) => {
	let data = { ...req.body, ...req.user };
	console.log('log of data from createTask: ', data);
	UseCase.createTask(
		data,
		(err, result) => {
			if (!err) {
				return res.status(201).send({
					errorCode: 0,
					data: result,
					message: 'Task created successfully',
					errors: [],
				});
			}
			return res.status(500).send({
				errorCode: 1,
				data: null,
				message: 'Error creating task',
				errors: [err.message],
			});
		},
		next,
	);
};

exports.getTasks = async (req, res, next) => {
	let data = { ...req.query, ...req.user };
	console.log('log of data from getTasks: ', data);
	UseCase.getTasks(
		data,
		(err, result) => {
			if (!err) {
				setTimeout(
					() =>
						res.status(200).send({
							errorCode: 0,
							data: result,
							message: 'getTasks successfully',
							errors: [],
						}),
					1000,
				);
			}
		},
		next,
	);
};

exports.getTaskDetail = async (req, res, next) => {
	let data = { ...req.params, ...req.user };
	console.log('log of data from getTaskDetail: ', data);
	UseCase.getTaskDetail(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'Successfully',
					errors: [],
				});
			}
			return res.status(500).send({
				errorCode: 1,
				data: null,
				message: 'Error getTaskDetail',
				errors: [err.message],
			});
		},
		next,
	);
};

exports.modifyTask = async (req, res, next) => {
	const taskImages = req.files;
	let data = { ...req.body, ...req.user, ...req.params, taskImages };
	console.log('log of data from modifyTask: ', data);
	UseCase.modifyTask(
		data,
		(err, result) => {
			if (!err) {
				return res.status(201).send({
					errorCode: 0,
					message: 'modified task',
					errors: [],
				});
			}
			return res.status(500).send({
				errorCode: 1,
				data: null,
				message: 'Error modifyTask',
				errors: [err.message],
			});
		},
		next,
	);
};

exports.deleteTask = async (req, res, next) => {
	let data = { ...req.user, ...req.params };
	console.log('log of data from deleteTask: ', data);
	UseCase.deleteTask(
		data,
		(err, result) => {
			if (!err) {
				return res.status(201).send({
					errorCode: 0,
					message: 'deleted',
					errors: [],
				});
			}
			return res.status(500).send({
				errorCode: 1,
				data: null,
				message: 'Error deleteTask',
				errors: [err.message],
			});
		},
		next,
	);
};
