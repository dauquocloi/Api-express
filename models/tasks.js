const { date, required } = require('joi');
var mongoose = require('mongoose');
const getFileUrl = require('../utils/getFileUrl');
// (Schema = mongoose.Schema), (ObjectId = Schema.ObjectId);
require('mongoose-double')(mongoose);

const Schema = mongoose.Schema;

const TasksSchema = new Schema(
	{
		status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
		taskContent: { type: String, required: true },
		detail: { type: String },
		executionDate: { type: Date, default: Date.now },
		performers: { type: [Schema.Types.ObjectId], ref: 'users', required: true },
		managements: { type: [Schema.Types.ObjectId], ref: 'users', required: true },
		images: { type: [String] },
	},

	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

TasksSchema.post('findOne', async function (doc) {
	try {
		if (doc?.images && doc.images?.length > 0) {
			const { images } = doc;
			const taskImageUrl = [];
			for (const key of images) {
				const signalUrl = await getFileUrl(key);
				console.log('log of signalUrl: ', signalUrl);
				taskImageUrl.push({ uri: signalUrl });
			}
			doc.images = taskImageUrl;
		}
	} catch (error) {
		throw error;
	}
});

// Register the room schema
exports.TasksEntity = mongoose.model('TasksEntity', TasksSchema, 'tasks');
