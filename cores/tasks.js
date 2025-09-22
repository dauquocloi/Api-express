let DataProvider = require('../data_providers/tasks');

exports.createTask = (data, cb, next) => {
	DataProvider.createTask(data, cb, next);
};

exports.getTasks = (data, cb, next) => {
	DataProvider.getTasks(data, cb, next);
};

exports.modifyTask = (data, cb, next) => {
	DataProvider.modifyTask(data, cb, next);
};

exports.deleteTask = (data, cb, next) => {
	DataProvider.deleteTask(data, cb, next);
};

exports.getTaskDetail = (data, cb, next) => {
	DataProvider.getTaskDetail(data, cb, next);
};
