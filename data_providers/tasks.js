const mongoose = require('mongoose');
const Entity = require('../models');
const uploadFile = require('../utils/uploadFile');
const { errorCodes } = require('../constants/errorCodes');
const Services = require('../service');

exports.createTask = async (data) => {
	const performerObjectIds = data.performers.map((performer) => mongoose.Types.ObjectId(performer));

	const getManagements = await Entity.BuildingsEntity.aggregate([
		{
			$match: {
				'management.user': {
					$in: performerObjectIds,
				},
			},
		},
		{
			$unwind: {
				path: '$management',
			},
		},
		{
			$group: {
				_id: '$management.user',
				role: {
					$first: '$management.role',
				},
			},
		},
	]);
	const managements = getManagements.map((m) => mongoose.Types.ObjectId(m._id));

	const newTaskData = {
		taskContent: data.taskContent,
		performers: performerObjectIds,
		detail: data.detail,
		managements: managements,
		executionDate: data.executionDate || Date.now(),
	};
	const taskCreated = await Services.tasks.createTask(newTaskData);

	return taskCreated;
};

exports.getTasks = async (userId, page = 1, search, startDate, endDate) => {
	const userObjectId = mongoose.Types.ObjectId(userId);
	const daysPerPage = 5; //days;
	const tasks = await Services.tasks.getTasks(userObjectId, page, daysPerPage, search, startDate, endDate);
	const isListEnd = tasks.length <= daysPerPage; // like has more

	return { tasks, page, isListEnd };
};

exports.modifyTask = async (data) => {
	const taskObjectId = mongoose.Types.ObjectId(data.taskId);

	const performerObjectIds = JSON.parse(data.performers).map((p) => mongoose.Types.ObjectId(p));

	const getTaskInfo = await Services.tasks.getTaskById(taskObjectId);

	getTaskInfo.taskContent = data.taskContent;
	getTaskInfo.detail = data.detail;
	getTaskInfo.executionDate = data.executionDate;
	getTaskInfo.performers = performerObjectIds;
	getTaskInfo.status = data.status; // Done task

	if (data.taskImages.length > 0) {
		const images = [];
		for (const image of data.taskImages) {
			const handleuploadFile = await uploadFile(image);
			images.push(handleuploadFile.Key);
		}
		getTaskInfo.images = images;
	}

	await getTaskInfo.save();

	return {
		taskId: data.taskId,
		completedRole: data.role,
		type: data.type, // ['modify', 'doneTask']
		performerIds: JSON.parse(data.performers),
		taskTitle: getTaskInfo.taskContent,
		taskStatus: data.status,
		managementIds: getTaskInfo.managements,
	};
};

exports.deleteTask = async (taskId) => {
	const removeTask = await Services.tasks.deleteTask(taskId);
	return removeTask;
};

exports.getTaskDetail = async (taskId) => {
	const taskInfo = await Services.tasks.getTaskById(taskId);
	return taskInfo;
};
