var mongoose = require('mongoose');
// const { any } = require('underscore');
const Schema = mongoose.Schema;
const Entity = require('./index');

const InvoicesSchema = new Schema({
	accountnumber: String,
	accountname: String,
	bankname: String,
	tranfercontent: String,
	note: String,
	date: {
		type: Date,
		default: () => Date.now(),
	},
	elecprice: Number,
	waterprice: Number,
	firstelecnumber: {
		type: Number,
		default: 0,
	},
	lastelecnumber: {
		type: Number,
		default: 0,
	},
	firstwatercnumber: {
		type: Number,
		default: 0,
	},
	lastwaternumber: {
		type: Number,
		default: 0,
	},
	service: {
		type: Schema.Types.ObjectId,
		ref: 'ServicesEntity',
	},
	room: {
		type: Schema.Types.ObjectId,
		ref: 'RoomsEntity',
	},
});

InvoicesSchema.pre('updateOne', async function (next) {
	let getquery = this.getQuery();
	console.log('query criteria', getquery);
	// const update = this.getUpdate(); // Lấy dữ liệu cập nhật
	let getlastelec = this._update.$set.lastelecnumber;
	let getfirstelec = this._update.$set.firstelecnumber;
	// or this._update['$set].lastelecnumber
	const roomId = getquery.room;
	console.log('this is log of roomId: ', roomId);
	try {
		const foundService = await Entity.ServicesEntity.findOne({ room: roomId }).exec();
		console.log(foundService);

		if (!foundService) {
			const error = new Error('Không tìm thấy dữ liệu service với id đã cung cấp.');
			return error;
		}
		const calculatedElecprice = (getlastelec - getfirstelec) * foundService.electric;
		this.set('elecprice', calculatedElecprice);
		console.log('this is log of elecprice: ', calculatedElecprice);
		next();
	} catch (err) {
		console.error(err);
	}
});

exports.InvoicesEntity = mongoose.model('InvoicesEntity', InvoicesSchema, 'invoices');
