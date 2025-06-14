var mongoose = require('mongoose');
// (Schema = mongoose.Schema), (ObjectId = Schema.ObjectId);
require('mongoose-double')(mongoose);

const Schema = mongoose.Schema;

const BanksSchema = new Schema({
	bankId: {
		type: String,
		trim: true,
	},
	brandName: {
		type: String,
		trim: true,
	},
	fullName: {
		type: String,
		tim: true,
	},
	shortName: {
		type: String,
		tim: true,
	},
	code: {
		type: String,
		trim: true,
	},
	bin: {
		type: String,
		trim: true,
	},
	logoPath: {
		type: String,
		trim: true,
	},
	iconPath: {
		type: String,
		trim: true,
	},
	active: { type: String, enum: ['1', '0'], default: '0' }, // trạng thái ngân hàng được xác nhận hay chưa ?
	owner: {
		type: Schema.Types.ObjectId,
		ref: 'users',
	},
	building: [
		{
			type: Schema.Types.ObjectId,
			ref: 'buildings',
		},
	],
});

exports.BanksEntity = mongoose.model('BanksEntity', BanksSchema, 'banks');
