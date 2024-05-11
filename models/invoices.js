var mongoose = require('mongoose');
// const { any } = require('underscore');
const Schema = mongoose.Schema;
const Entity = require('./index');

const InvoicesSchema = new Schema({
	daystay: {
		type: Number,
		default: 30,
	},
	period: Date,
	elecprice: Number,
	waterprice: Number,
	elevator: Number,
	motobike: Number,
	firstelecnumber: {
		type: Number,
		default: 0,
	},
	lastelecnumber: {
		type: Number,
		default: 0,
	},
	firstwaternumber: {
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
	total: Number,
});

InvoicesSchema.pre('updateOne', async function (next) {
	let getquery = this.getQuery();
	console.log('query criteria', getquery);
	const update = this.getUpdate(); // Lấy dữ liệu cập nhật
	let getlastelec = this._update.$set.lastelecnumber;
	let getfirstelec = this._update.$set.firstelecnumber;

	let getlastWater = this._update.$set.lastwaternumber;
	let getfirstWater = this._update.$set.firstwaternumber;
	// or this._update['$set].lastelecnumber
	const roomId = getquery.room;
	console.log('this is log of roomId: ', roomId);
	try {
		const foundService = await Entity.ServicesEntity.findOne({ room: roomId }).exec();
		console.log('this is log of foundService: ', foundService);
		const foundRoom = await Entity.RoomsEntity.findOne({ _id: roomId }).exec();
		console.log('this is lof of fondRooms_InvoiceSchema:', foundRoom);
		if (!foundService) {
			const error = new Error('Không tìm thấy dữ liệu service với id đã cung cấp.');
			return error;
		}
		const calculatedElecprice = (getlastelec - getfirstelec) * foundService.electric;
		this.set('elecprice', calculatedElecprice);
		console.log('this is log of elecprice: ', calculatedElecprice);

		if (foundService.iswaterpayment == true) {
			const calculatedWaterprice = (getlastWater - getfirstWater) * foundService.waterindex;
			this.set('waterprice', calculatedWaterprice);
			console.log('this is log of waterPrice', calculatedWaterprice);
		}
		// calculate total bill
		const calculatedTotal =
			((foundRoom.roomprice +
				foundService.generalservice +
				this.get('waterprice') +
				this.get('elevator') +
				this.get('motobike') +
				this.get('elecprice')) /
				30) *
			this.get('daystay');
		// Total Cost Round
		const totalCostRound = Math.round(calculatedTotal / 1000) * 1000;

		this.set('total', totalCostRound);
		console.log('this is total_invoice', totalCostRound);
		next();
	} catch (err) {
		console.error(err);
	}
});

InvoicesSchema.pre('save', async function (next) {
	// let filter = this.getFilter();
	// console.log('query filter', filter);
	// const update = this.getUpdate(); // Lấy dữ liệu cập nhật
	let getlastelec = this.lastelecnumber;
	let getfirstelec = this.firstelecnumber;
	let getlastWater = this.lastwaternumber;
	console.log('getlastWater', getlastWater);
	let getfirstWater = this.firstwaternumber;
	console.log('getfirstWater', getfirstWater);

	let roomId = this.room;
	console.log('this is roomid', roomId);
	// or this._update['$set].lastelecnumber
	// const roomId = getquery.room;
	console.log('this is log of roomId: ', roomId);
	try {
		const foundService = await Entity.ServicesEntity.findOne({ room: roomId }).exec();
		console.log('this is log of foundService: ', foundService);
		const foundRoom = await Entity.RoomsEntity.findOne({ _id: roomId }).exec();
		console.log('this is lof of fondRooms_InvoiceSchema:', foundRoom);
		if (!foundService) {
			const error = new Error('Không tìm thấy dữ liệu service với id đã cung cấp.');
			return error;
		}
		const calculatedElecprice = (getlastelec - getfirstelec) * foundService.electric;
		this.set('elecprice', calculatedElecprice);
		console.log('this is log of elecprice: ', calculatedElecprice);

		// caculate water number
		if (foundService.iswaterpayment === true) {
			const calculatedWaterprice = (getlastWater - getfirstWater) * foundService.waterindex;
			this.set('waterprice', calculatedWaterprice);
			console.log('this is log of waterPrice', calculatedWaterprice);
		}
		// calculate total bill
		const calculatedTotal =
			((foundRoom.roomprice +
				foundService.generalservice +
				this.get('waterprice') +
				this.get('elevator') +
				this.get('motobike') +
				this.get('elecprice')) /
				30) *
			this.get('daystay');
		// Total Cost Round
		const totalCostRound = Math.round(calculatedTotal / 1000) * 1000;

		this.set('total', totalCostRound);
		console.log('this is total_invoice', totalCostRound);
		next();
	} catch (err) {
		console.error(err);
	}
});

exports.InvoicesEntity = mongoose.model('InvoicesEntity', InvoicesSchema, 'invoices');
