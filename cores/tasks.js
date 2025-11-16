let DataProvider = require('../data_providers/tasks');
const { notificationQueue } = require('../queues');

exports.createTask = (data, cb, next) => {
	DataProvider.createTask(data, cb, next);
};

exports.getTasks = (data, cb, next) => {
	DataProvider.getTasks(data, cb, next);
};

exports.modifyTask = (data, cb, next) => {
	DataProvider.modifyTask(
		data,
		(err, result) => {
			if (err) return cb(err, null);

			if (result.type === 'doneJob' && result.completedRole != 'owner') {
				console.log('log of result: ', result);
				notificationQueue.add(
					{
						type: 'task',
						payload: {
							taskId: result.taskId,
							title: result.taskTitle,
							performerIds: result.performerIds,
							buildingId: result.buildingId,
							managementIds: result.managementIds,
							// completedId
						},
					},
					{
						attempts: 1,
						backoff: 1000,
						removeOnComplete: true,
						removeOnFail: false, // bỏ nếu tác dụ thất bại
					},
				);
			}

			console.log('✅ Job added to notification queue');

			cb(null, 'modified');
		},
		next,
	);
};

exports.deleteTask = (data, cb, next) => {
	DataProvider.deleteTask(data, cb, next);
};

exports.getTaskDetail = (data, cb, next) => {
	DataProvider.getTaskDetail(data, cb, next);
};
