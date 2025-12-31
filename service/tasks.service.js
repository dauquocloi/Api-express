const { NotFoundError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');

exports.findById = (taskId) => Entity.TasksEntity.findById(taskId);

exports.createTask = async ({ taskContent, performers, detail, managements, executionDate }) => {
	const newTask = await Entity.TasksEntity.create({ taskContent, performers, detail, managements, executionDate, status: 'pending' });

	return newTask;
};

exports.getTasks = async (userObjectId, page = 1, daysPerPage, search, startDate, endDate) => {
	const tasks = await Entity.TasksEntity.aggregate(Pipelines.tasks.getTasks(userObjectId, page, daysPerPage, search, startDate, endDate));
	return tasks;
};

exports.getTaskById = async (taskObjectId) => {
	const task = await Entity.TasksEntity.findById(taskObjectId);
	if (!task) throw new NotFoundError('Dữ liệu không tồn tại');
	return task;
};

exports.deleteTask = async (taskId) => {
	const removeTask = await Entity.TasksEntity.findOneAndDelete({ _id: taskId });
	if (!removeTask) throw new NotFoundError(`Công việc không tồn tại!`);
	return removeTask;
};
