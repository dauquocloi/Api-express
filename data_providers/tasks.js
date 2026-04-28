const mongoose = require('mongoose');
const Entity = require('../models');
const uploadFile = require('../utils/uploadFile');
const { errorCodes } = require('../constants/errorCodes');
const Services = require('../service');
// const { NotiTaskCompletedJob } = require('../jobs/Notifications');
const { notiTaskCompletedJob } = require('../jobs/notification/notification.job');
const { BadRequestError } = require('../AppError');
const ROLES = require('../constants/userRoles');
const dayjs = require('dayjs');

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

	const result = await Services.tasks.createTask(newTaskData);
	const taskCreated = await Services.tasks
		.findById(result._id)
		.populate([
			{
				path: 'managements',
				select: 'fullName _id avatar',
			},
			{
				path: 'performers',
				select: 'fullName _id avatar',
			},
		])
		.lean()
		.exec();

	console.log('taskCreated: ', taskCreated);

	return {
		_id: dayjs(taskCreated.executionDate).format('YYYY-MM-DD'),
		data: {
			_id: taskCreated._id,
			status: taskCreated.status,
			taskContent: taskCreated.taskContent,
			detail: taskCreated.detail,
			executionDate: taskCreated.executionDate,
			performers: taskCreated.performers,
			managements: taskCreated.managements,
			createdAt: taskCreated.createdAt,
			updatedAt: taskCreated.updatedAt,
		},
	};
};

exports.getTasks = async (userId, page = 1, search, startDate, endDate) => {
	console.log('getTasks Provider: ', userId, page, search, startDate, endDate);
	if (!userId || !mongoose.isValidObjectId(new mongoose.Types.ObjectId(userId))) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ');

	const userObjectId = new mongoose.Types.ObjectId(userId);

	if (search && search?.trim() !== '') {
		const PAGE_SIZE = 10;
		const tasks = await Services.tasks.getTasksCaseQuery(userObjectId, page, search, startDate, endDate, PAGE_SIZE);

		return { tasks: tasks.slice(0, PAGE_SIZE), page, isListEnd: tasks.length <= PAGE_SIZE };
	}

	const DAYS_PER_PAGE = 5; //days;
	const tasks = await Services.tasks.getTasks(userObjectId, page, DAYS_PER_PAGE, startDate, endDate);
	const isListEnd = tasks.length <= DAYS_PER_PAGE; // like has more
	console.log('Is tasks ended: ', isListEnd);

	return { tasks: tasks.slice(0, DAYS_PER_PAGE), page, isListEnd };
};

exports.modifyTask = async (data) => {
	const existingTask = await Services.tasks.findById(data.taskId).lean().exec();
	if (!existingTask) {
		return new BadRequestError('Dữ liệu không tồn tại!');
	}

	// Prepare update data
	const updateData = {
		taskContent: data.taskContent,
		detail: data.detail,
		executionDate: data.executionDate,
		performers: data.performers,
		status: data.status,
	};

	// Handle image upload if needed
	if (data.taskImages?.length > 0) {
		const imageUploadPromises = data.taskImages.map((image) => uploadFile(image));
		const uploadResults = await Promise.all(imageUploadPromises);
		updateData.images = uploadResults.map((result) => result.Key);
	}

	// Update task and return populated document in one query
	const taskModified = await Services.tasks.updateTask({ taskId: data.taskId, ...updateData });
	console.log('taskModified: ', taskModified);

	// Enqueue notification if task completed
	if (data.status === 'completed') {
		await notiTaskCompletedJob({
			managementIds: taskModified.managements.map((m) => m._id),
			performerIds: data.performers,
			taskTitle: taskModified.taskContent,
			taskId: data.taskId.toString(),
		});
	}

	return {
		_id: dayjs(taskModified.executionDate).format('YYYY-MM-DD'),
		data: {
			_id: taskModified._id,
			status: taskModified.status,
			taskContent: taskModified.taskContent,
			detail: taskModified.detail,
			executionDate: taskModified.executionDate,
			performers: taskModified.performers,
			managements: taskModified.managements,
			createdAt: taskModified.createdAt,
			updatedAt: taskModified.updatedAt,
		},
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
