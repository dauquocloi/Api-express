var mongoose = require('mongoose');
const getFileUrl = require('../utils/getFileUrl');
const { TASK_STATUS } = require('../constants/tasks');

const Schema = mongoose.Schema;

const TasksSchema = new Schema(
	{
		status: { type: String, enum: Object.values(TASK_STATUS), default: TASK_STATUS.PENDING },
		taskContent: { type: String, required: true },
		detail: { type: String },
		executionDate: { type: Date, default: Date.now },
		performers: { type: [Schema.Types.ObjectId], ref: 'UsersEntity', required: true },
		managements: { type: [Schema.Types.ObjectId], ref: 'UsersEntity', required: true },
		images: { type: [String] },
	},

	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

// TasksSchema.index(
// 	{ taskContent: 'text', detail: 'text' },
// 	{ weights: { taskContent: 10, detail: 5 }, name: 'TaskSearchIndex', default_language: 'none' },
// );

// Register the room schema
exports.TasksEntity = mongoose.model('TasksEntity', TasksSchema, 'tasks');
