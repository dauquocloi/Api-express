const mongoose = require('mongoose');
var Entity = require('../models');
const uploadFile = require('../utils/uploadFile');

exports.createTask = async (data, cb, next) => {
	try {
		const performerObjectIds = data.performers.map((performer) => mongoose.Types.ObjectId(performer));
		let userObjectId = mongoose.Types.ObjectId(data.userId);

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
		console.log('log of getManagements: ', getManagements);

		const managements = getManagements.map((m) => mongoose.Types.ObjectId(m._id));

		console.log('log of managements: ', managements);

		const newTask = await Entity.TasksEntity.create({
			taskContent: data.taskContent,
			performers: performerObjectIds,
			detail: data.detail,
			managements: managements,
			status: 'pending',
			executionDate: data.executionDate || Date.now(),
		});

		cb(null, newTask);
	} catch (error) {
		next(error);
	}
};

exports.getTasks = async (data, cb, next) => {
	try {
		let userObjectId = mongoose.Types.ObjectId(data.userId);

		const page = parseInt(data.page) || 1; // ví dụ: page=1 -> 5 ngày gần nhất, page=2 -> 5 ngày tiếp theo
		const daysPerPage = 5;

		let search = data.data.search;
		console.log('log of search:', search);

		if (data.role !== 'owner') {
			const getOwnerId = await Entity.BuildingsEntity.findOne({ 'management.user': { $eq: userObjectId } }, { management: 1 });
			console.log('log of getOwnerId: ', getOwnerId);
		}

		let matchQuery = {};

		// fullText search
		search = search.trim().replace(/\s+/g, ' ');
		if (search && search.trim() !== '') {
			matchQuery.$search = {
				index: 'default',
				compound: {
					must: [
						{
							text: {
								query: search,
								path: ['taskContent', 'detail'],
							},
						},
						{
							equals: {
								path: 'managements',
								value: userObjectId,
							},
						},
					],
				},
			};
		} else {
			matchQuery.$match = {
				managements: { $eq: userObjectId },
			};
		}
		console.log('log of matchQuery: ', matchQuery);

		// Tìm kiếm theo matchQuery
		// if (queryStatus) matchQuery.$and = [queryStatus];

		// Tìm kiếm theo ngày
		if (data.startDate || data.endDate) {
			matchQuery.executionDate = {};

			if (data.startDate) {
				const start = new Date(data.startDate);
				start.setHours(0, 0, 0, 0); // bắt đầu từ 00:00:00
				matchQuery.executionDate.$gte = start;
			}

			if (data.endDate) {
				const end = new Date(data.endDate);
				end.setHours(23, 59, 59, 999); // hết ngày 23:59:59
				matchQuery.executionDate.$lte = end;
			}
		}

		const tasks = await Entity.TasksEntity.aggregate([
			matchQuery,
			{
				$lookup: {
					from: 'users',
					localField: 'managements',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								_id: 1,
								fullName: 1,
								avatar: 1,
							},
						},
					],
					as: 'managements',
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'performers',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								_id: 1,
								fullName: 1,
								avatar: 1,
							},
						},
					],
					as: 'performers',
				},
			},
			{
				$project: {
					_id: 1,
					status: 1,
					performers: 1,
					managements: 1,
					taskContent: 1,
					createdAt: 1,
					updatedAt: 1,
					executionDate: 1,
				},
			},

			{
				$sort: {
					createdAt: -1,
				},
			},
			{
				$group: {
					_id: {
						$dateToString: {
							format: '%Y-%m-%d',
							date: '$createdAt',
							timezone: '+07:00',
						},
					},
					data: {
						$push: '$$ROOT',
					},
				},
			},
			{
				$sort: {
					_id: -1,
				},
			},

			// Phân trang theo ngày
			{ $skip: (page - 1) * daysPerPage },
			{ $limit: daysPerPage + 1 },
		]);

		const isListEnd = tasks.length > daysPerPage; // like has more
		console.log('log of is hasMore: ', isListEnd);

		cb(null, { tasks, page, isListEnd: !isListEnd });
	} catch (error) {
		next(error);
	}
};

exports.modifyTask = async (data, cb, next) => {
	try {
		const taskObjectId = mongoose.Types.ObjectId(data.taskId);
		console.log('log of parse performers: ', JSON.parse(data.performers));
		const performerObjectIds = JSON.parse(data.performers).map((p) => mongoose.Types.ObjectId(p));

		const getTaskInfo = await Entity.TasksEntity.findOne({ _id: taskObjectId });
		if (!getTaskInfo) throw new Erorr(`Công việc với id: ${data.taskId} không tồn tại !`);

		getTaskInfo.taskContent = data.taskContent;
		getTaskInfo.detail = data.detail;
		getTaskInfo.executionDate = data.executionDate;
		getTaskInfo.performers = performerObjectIds;
		getTaskInfo.status = data.status;

		if (data.taskImages.length > 0) {
			const images = [];
			for (const image of data.taskImages) {
				const handleuploadFile = await uploadFile(image);
				images.push(handleuploadFile.Key);
			}
			getTaskInfo.images = images;
		}

		await getTaskInfo.save();

		cb(null, 'modified');
	} catch (error) {
		next(error);
	}
};

exports.deleteTask = async (data, cb, next) => {
	try {
		const taskObjectId = mongoose.Types.ObjectId(data.taskId);

		const removeTask = await Entity.TasksEntity.findOneAndDelete({ _id: taskObjectId });
		if (!removeTask) throw new Error(`Công việc không tồn tại!`);
		cb(null, 'deleted');
	} catch (error) {
		next(error);
	}
};

exports.getTaskDetail = async (data, cb, next) => {
	try {
		const taskObjectId = mongoose.Types.ObjectId(data.taskId);

		const taskInfo = await Entity.TasksEntity.findOne({ _id: taskObjectId }).lean();
		if (!taskInfo) throw new Error(`Công việc không tồn tại !`);

		cb(null, taskInfo);
	} catch (error) {
		next(error);
	}
};
