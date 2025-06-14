const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { result } = require('underscore');
var XLSX = require('xlsx');
// const { config } = require('dotenv');
// const { config } = require('dotenv');
var workBook = XLSX.readFile('D:excelData/tempData.xlsx');
let workSheet = workBook.Sheets[workBook.SheetNames[0]];

//  get all buildings by managername
exports.getAll = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const userId = mongoose.Types.ObjectId(`${data.userId}`);
		await Entity.BuildingsEntity.find({ 'management.user': userId }).lean().exec(cb);
	} catch (error) {
		next(error);
	}
};

// not used
exports.create = async (data, cb, next) => {
	try {
		// handle validator
		const errors = validateData(data);
		if (errors.length > 0) {
			return cb({ message: 'Validation error', errors });
		}
		// Tạo building
		const building = await Entity.BuildingsEntity.create({
			buildingname: data.buildingname,
			buildingadress: data.buildingadress,
			roomquantity: data.roomquantity,
			ownername: data.ownername,
			ownerphonenumber: data.ownerphonenumber,
			managername: data.managername,
			managerphonenumber: data.managerphonenumber,
		});

		const buildingId = building._id;

		// Dùng Promise.all để xử lý đồng thời việc tạo phòng, service, và payment
		const roomPromises = Array.from({ length: data.roomquantity }, async (_, i) => {
			const room = await Entity.RoomsEntity.create({
				roomindex: i + 1,
				roomprice: data.roomprice,
				roomdeposit: data.roomdeposit,
				roomtypes: data.roomtypes,
				roomacreage: data.roomacreage,
				maylanh: data.maylanh,
				giengtroi: data.giengtroi,
				gac: data.gac,
				kebep: data.kebep,
				bonruachen: data.bonruachen,
				cuaso: data.cuaso,
				bancong: data.bancong,
				tulanh: data.tulanh,
				tivi: data.tivi,
				thangmay: data.thangmay, // sửa lại cho đúng
				nuocnong: data.nuocnong,
				giuong: data.giuong,
				nem: data.nem,
				tuquanao: data.tuquanao,
				chungchu: data.chungchu,
				baove: data.baove,
				building: buildingId,
			});

			const service = await Entity.ServicesEntity.create({
				room: room._id,
				electric: data.electric,
				waterindex: data.waterindex,
				motobike: data.motobike,
				elevator: data.elevator,
				water: data.water,
				generalservice: data.generalservice,
				iswaterpayment: data.iswaterpayment,
			});

			const payment = await Entity.PaymentsEntity.create({
				service: service._id,
				room: room._id,
				accountnumber: data.accountnumber,
				accountname: data.accountname,
				bankname: data.bankname,
				tranfercontent: data.tranfercontent,
				note: data.note,
			});

			await Entity.RoomsEntity.updateOne({ _id: room._id }, { $set: { service: service._id, payment: payment._id } });
		});

		await Promise.all(roomPromises);

		// Trả về kết quả
		cb(null, 'created successfully');
	} catch (error) {
		next(error);
		cb(error);
	}
};

exports.createBuilding = (data, cb) => {
	for (let index = 2; index < 4; index++) {
		const buildingName = workSheet[`A${index}`].v;
		const buildingAdress = workSheet[`B${index}`].v;
		const ownerName = workSheet[`C${index}`].v;
		const roomQuantity = workSheet[`D${index}`].v;

		console.log({
			buildingName,
			buildingAdress,
			ownerName,
			roomQuantity,
		});
	}
	cb('TempData');
};

// lấy user by emai
exports.getEmail = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			Entity.UsersEntity.findOne({ email: data.email }, cb);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

// lấy user by email token
exports.getEmailbyToken = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			Entity.UsersEntity.findOne({ email: data }, cb);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.getBankStatus = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const userId = mongoose.Types.ObjectId(data.userId);
		const bankStatus = await Entity.BuildingsEntity.find({ 'management.user': userId });

		if (bankStatus != null) {
			cb(null, bankStatus);
		}
	} catch (error) {
		next(error);
	}
};
