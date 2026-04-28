const { default: mongoose } = require('mongoose');
const { NotFoundError, BadRequestError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');
const dayjs = require('dayjs');

exports.findById = (taskId) => Entity.TasksEntity.findById(taskId);

exports.createTask = async ({ taskContent, performers, detail, managements, executionDate }) => {
	const newTask = await Entity.TasksEntity.create({ taskContent, performers, detail, managements, executionDate, status: 'pending' });

	return newTask;
};

exports.getTasks = async (userObjectId, page = 1, daysPerPage, startDate, endDate) => {
	const tasks = await Entity.TasksEntity.aggregate(Pipelines.tasks.getTasks(userObjectId, page, daysPerPage, startDate, endDate));

	return tasks;
};

exports.getTasksCaseQuery = async (userObjectId, page = 1, search, startDate, endDate, scope) => {
	return await Entity.TasksEntity.aggregate(Pipelines.tasks.getTasksWithQuery(userObjectId, page, search, startDate, endDate, scope));
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

exports.updateTask = async ({ taskId, taskContent, detail, executionDate, performers, status, images = null }, session = null) => {
	const querys = {
		taskContent,
		detail,
		executionDate,
		performers,
		status,
	};
	if (images) querys.images = images;

	const result = await Entity.TasksEntity.findOneAndUpdate({ _id: taskId }, querys, { new: true, session: session })
		.populate([
			{ path: 'managements', select: 'fullName _id avatar' },
			{ path: 'performers', select: 'fullName _id avatar' },
		])
		.lean();

	if (!result) throw new NotFoundError(`Công việc không tồn tại!`);
	return result;
};
