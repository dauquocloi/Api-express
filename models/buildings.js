var mongoose = require('mongoose');
// (Schema = mongoose.Schema), (ObjectId = Schema.ObjectId);
require('mongoose-double')(mongoose);

const Schema = mongoose.Schema;
// Create a Mongoose Schema
var BuildingsSchema = new Schema(
	{
		buildingname: String,
		buildingadress: String,
		roomquantity: Number,
		ownername: String,
		ownerphonenumber: String,
		managername: String,
		managerphonenumber: String,
		roomquantity: Number,
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
	},
);

// Register the room schema
exports.BuildingEntity = mongoose.model('BuildingsEntity', BuildingsSchema, 'buildings');
