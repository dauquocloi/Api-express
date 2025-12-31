const mongoose = require('mongoose');
const Entity = require('../models');
const uploadFile = require('../utils/uploadFile');
const { errorCodes } = require('../constants/errorCodes');
const Services = require('../service');
const { NotiTaskCompletedJob } = require('../jobs/Notifications');
const { BadRequestError } = require('../AppError');
const ROLES = require('../constants/userRoles');

exports.createTask = async (performers, userId, taskContent, detail, executionDate) => {
	let performerObjectIds = [];

	const buildings = await Services.buildings.getAllByManagementId(userId);
	if (!Array.isArray(buildings) || buildings.length === 0) {
		throw new BadRequestError('Dữ liệu người dùng không tồn tại trong hệ thống!');
	}

	const allBuildingUserSet = new Set();
	const managementUserSet = new Set();

	for (const b of buildings) {
		for (const m of b.management || []) {
			const userIdStr = m.user.toString();

			allBuildingUserSet.add(userIdStr);

			// chỉ management (owner / manager)
			if (m.role !== ROLES['STAFF']) {
				managementUserSet.add(userIdStr);
			}
		}
	}

	if (managementUserSet.size === 0) {
		throw new BadRequestError('Dữ liệu đầu vào không hợp lệ!');
	}

	if (!Array.isArray(performers) || performers.length === 0) {
		performerObjectIds = [...managementUserSet].map((id) => new mongoose.Types.ObjectId(id));
	} else {
		const inputSet = new Set(performers.map((id) => id.toString()));

		for (const id of inputSet) {
			if (!allBuildingUserSet.has(id)) {
				throw new BadRequestError(`Performer không thuộc danh sách nhân sự các tòa nhà quản lý: ${id}`);
			}
		}

		performerObjectIds = [...inputSet].map((id) => new mongoose.Types.ObjectId(id));
	}

	const newTaskData = {
		taskContent,
		performers: performerObjectIds,
		detail: detail ?? '',
		managements: [...managementUserSet].map((id) => new mongoose.Types.ObjectId(id)),
		executionDate: executionDate || Date.now(),
	};

	return await Services.tasks.createTask(newTaskData);
};

exports.getTasks = async (userId, page = 1, search, startDate, endDate) => {
	const userObjectId = new mongoose.Types.ObjectId(userId);
	const daysPerPage = 5; //days;
	const tasks = await Services.tasks.getTasks(userObjectId, page, daysPerPage, search, startDate, endDate);
	const isListEnd = tasks.length <= daysPerPage; // like has more

	return { tasks, page, isListEnd };
};

exports.modifyTask = async (data) => {
	const getTaskInfo = await Services.tasks.findById(data.taskId);

	getTaskInfo.taskContent = data.taskContent;
	getTaskInfo.detail = data.detail;
	getTaskInfo.executionDate = data.executionDate;
	getTaskInfo.performers = data.performers;
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
	if (getTaskInfo.status === 'completed') {
		const jobPayload = {
			managementIds: getTaskInfo.managements,
			performerIds: data.performers,
			taskTitle: getTaskInfo.taskContent,
			taskId: data.taskId,
		};
		await new NotiTaskCompletedJob().enqueue(jobPayload);
	}

	return {
		taskId: data.taskId,
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
