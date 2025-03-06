var mongoose = require('mongoose');
// const { any } = require('underscore');
const Schema = mongoose.Schema;
const Entity = require('./index');
const FeesSchema = require('./fees');

const FeeInvoiceSchema = new Schema({
	feeName: String,
	amount: Number,
	type: {
		enum: ['person', 'index', 'vehicle', 'room'],
		type: String,
		required: true,
	},
	quantity: {
		type: Number,
		required: function () {
			return this.type === 'person' || this.type === 'vehicle';
		},
	},
	firstIndex: {
		type: Number,
		required: function () {
			return this.type === 'index';
		},
	},
	lastIndex: {
		type: Number,
		required: function () {
			return this.type === 'index';
		},
	},
});

FeeInvoiceSchema.pre('validate', function (next) {
	if (this.type === 'index' && (this.firstIndex == null || this.lastIndex == null)) {
		return next(new Error('firstIndex và lastIndex là bắt buộc khi type là "index"'));
	}
	if ((this.type === 'person' || this.type === 'vehicle') && this.quantity == null) {
		return next(new Error('quantity là bắt buộc khi type là "person" hoặc "vehicle"'));
	}
	next();
});

const InvoicesSchema = new Schema({
	stayDays: {
		type: Number,
		default: 30,
		min: [1, 'stayDays must be at least 1'],
		max: [30, 'stayDays cannot exceed 30'],
		validate: {
			validator: Number.isInteger,
			message: 'stayDays must be an integer',
		},
	},
	month: {
		type: Number,
		required: true,
		min: [1, 'month must be at least 1'],
		max: [12, 'month cannot exceed 30'],
		validate: {
			validator: Number.isInteger,
			message: 'month must be an integer',
		},
	}, // Tháng (1 - 12)
	year: {
		type: Number,
		required: true,
		validate: {
			validator: Number.isInteger,
			message: 'years must be an integer',
		},
	}, // Năm
	room: {
		type: Schema.Types.ObjectId,
		ref: 'RoomsEntity',
	},
	total: {
		type: Number,
		required: true,
		default: 0,
	},
	status: { type: String, enum: ['unpaid', 'paid', 'partial'], default: 'unpaid' },
	fee: [FeeInvoiceSchema],
});

// Thêm validation cho logic

// InvoicesSchema.pre('updateOne', async function (next) {
// 	let getquery = this.getQuery();
// 	console.log('query criteria', getquery);
// 	const update = this.getUpdate(); // Lấy dữ liệu cập nhật
// 	let getlastelec = this._update.$set.lastelecnumber;
// 	let getfirstelec = this._update.$set.firstelecnumber;

// 	let getlastWater = this._update.$set.lastwaternumber;
// 	let getfirstWater = this._update.$set.firstwaternumber;
// 	// or this._update['$set].lastelecnumber
// 	const roomId = getquery.room;
// 	console.log('this is log of roomId: ', roomId);
// 	try {
// 		const foundService = await Entity.ServicesEntity.findOne({ room: roomId }).exec();
// 		console.log('this is log of foundService: ', foundService);
// 		const foundRoom = await Entity.RoomsEntity.findOne({ _id: roomId }).exec();
// 		console.log('this is lof of fondRooms_InvoiceSchema:', foundRoom);
// 		if (!foundService) {
// 			const error = new Error('Không tìm thấy dữ liệu service với id đã cung cấp.');
// 			return error;
// 		}
// 		const calculatedElecprice = (getlastelec - getfirstelec) * foundService.electric;
// 		this.set('elecprice', calculatedElecprice);
// 		console.log('this is log of elecprice: ', calculatedElecprice);

// 		if (foundService.iswaterpayment == true) {
// 			const calculatedWaterprice = (getlastWater - getfirstWater) * foundService.waterindex;
// 			this.set('waterprice', calculatedWaterprice);
// 			console.log('this is log of waterPrice', calculatedWaterprice);
// 		}
// 		// calculate total bill
// 		const calculatedTotal =
// 			((foundRoom.roomprice +
// 				foundService.generalservice +
// 				this.get('waterprice') +
// 				this.get('elevator') +
// 				this.get('motobike') +
// 				this.get('elecprice')) /
// 				30) *
// 			this.get('daystay');
// 		// Total Cost Round
// 		const totalCostRound = Math.round(calculatedTotal / 1000) * 1000;

// 		this.set('total', totalCostRound);
// 		console.log('this is total_invoice', totalCostRound);
// 		next();
// 	} catch (err) {
// 		console.error(err);
// 	}
// });

// InvoicesSchema.pre('save', async function (next) {
// 	// let filter = this.getFilter();
// 	// console.log('query filter', filter);
// 	// const update = this.getUpdate(); // Lấy dữ liệu cập nhật
// 	let getlastelec = this.lastelecnumber;
// 	let getfirstelec = this.firstelecnumber;
// 	let getlastWater = this.lastwaternumber;
// 	console.log('getlastWater', getlastWater);
// 	let getfirstWater = this.firstwaternumber;
// 	console.log('getfirstWater', getfirstWater);

// 	let roomId = this.room;
// 	console.log('this is roomid', roomId);
// 	// or this._update['$set].lastelecnumber
// 	// const roomId = getquery.room;
// 	console.log('this is log of roomId: ', roomId);
// 	try {
// 		const foundService = await Entity.ServicesEntity.findOne({ room: roomId }).exec();
// 		console.log('this is log of foundService: ', foundService);
// 		const foundRoom = await Entity.RoomsEntity.findOne({ _id: roomId }).exec();
// 		console.log('this is lof of fondRooms_InvoiceSchema:', foundRoom);
// 		if (!foundService) {
// 			const error = new Error('Không tìm thấy dữ liệu service với id đã cung cấp.');
// 			return error;
// 		}
// 		const calculatedElecprice = (getlastelec - getfirstelec) * foundService.electric;
// 		this.set('elecprice', calculatedElecprice);
// 		console.log('this is log of elecprice: ', calculatedElecprice);

// 		// caculate water number
// 		if (foundService.iswaterpayment === true) {
// 			const calculatedWaterprice = (getlastWater - getfirstWater) * foundService.waterindex;
// 			this.set('waterprice', calculatedWaterprice);
// 			console.log('this is log of waterPrice', calculatedWaterprice);
// 		}
// 		// calculate total bill
// 		const calculatedTotal =
// 			((foundRoom.roomprice +
// 				foundService.generalservice +
// 				this.get('waterprice') +
// 				this.get('elevator') +
// 				this.get('motobike') +
// 				this.get('elecprice')) /
// 				30) *
// 			this.get('daystay');
// 		// Total Cost Round
// 		const totalCostRound = Math.round(calculatedTotal / 1000) * 1000;

// 		this.set('total', totalCostRound);
// 		console.log('this is total_invoice', totalCostRound);
// 		next();
// 	} catch (err) {
// 		console.error(err);
// 	}
// });

exports.InvoicesEntity = mongoose.model('InvoicesEntity', InvoicesSchema, 'invoices');
