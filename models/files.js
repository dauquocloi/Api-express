var mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create a Mongoose Schema
const FilesSchema = new Schema({
	path: String,
});

exports.FilesEntity = mongoose.model('FilesEntity', FilesSchema, 'files');
