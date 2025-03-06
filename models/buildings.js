var mongoose = require('mongoose');
// (Schema = mongoose.Schema), (ObjectId = Schema.ObjectId);
require('mongoose-double')(mongoose);

const Schema = mongoose.Schema;
// Create a Mongoose Schema
var BuildingsSchema = new Schema(
	{
		buildingName: String, // Để hiển thị ở thanh lọc (short name).
		buildingAddress: {
			type: String,
			required: true,
		},
		roomQuantity: Number,
		ownerName: String,
		ownerPhone: String,
		managerName: String,
		managerPhone: String,
		about: String,
	},
	{
		versionKey: false,
		collation: { locale: 'vi' },
	},
);

// Register the room schema
exports.BuildingEntity = mongoose.model('BuildingsEntity', BuildingsSchema, 'buildings');
