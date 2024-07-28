const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { result } = require('underscore');

//  get all buildings by managername
exports.getAll = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			// get all building by managername
			Entity.BuildingsEntity.find({ managername: data.managername }, cb);
		})
		.catch((err) => {
			console.log('ueser_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.create = (data, cb) => {
	// khai báo các biến sử dụng để lấy id
	let buildingId;
	let findRoomid;
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			// building create
			Entity.BuildingsEntity.create({
				buildingname: data.buildingname,
				buildingadress: data.buildingadress,
				roomquantity: data.roomquantity,
				ownername: data.ownername,
				ownerphonenumber: data.ownerphonenumber,
				managername: data.managername,
				managerphonenumber: data.managerphonenumber,
			})
				// room create
				.then((building) => {
					buildingId = building._id;
					let n = data.roomquantity;
					let i = 1;
					for (i; i <= n; i++) {
						let roomId;
						let paymentId;
						let serviceId;
						Entity.RoomsEntity.create({
							roomindex: i, // lặp từ 1 đến n với n là số lượng phòng
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
							thangmay: data.tivi,
							nuocnong: data.nuocnong,
							giuong: data.giuong,
							nem: data.nem,
							tuquanao: data.tuquanao,
							chungchu: data.chungchu,
							baove: data.baove,
							building: buildingId,
						}).then(async (room) => {
							roomId = room._id;
							let serviceCreated = await Entity.ServicesEntity.create({
								room: roomId,
								electric: data.electric,
								waterindex: data.waterindex, // if water index
								motobike: data.motobike,
								elevator: data.elevator,
								water: data.water, // if water/ person
								generalservice: data.generalservice,
								iswaterpayment: data.iswaterpayment,
							}).then(async (service) => {
								serviceId = service._id;
								let invoiceCreated = await Entity.PaymentsEntity.create({
									service: serviceId,
									room: roomId,
									accountnumber: data.accountnumber,
									accountname: data.accountname,
									bankname: data.bankname,
									tranfercontent: data.tranfercontent,
									note: data.note,
								}).then(async (payment) => {
									paymentId = payment._id;
									let convertedServiceId = ObjectId(serviceId);
									let convertedPaymentId = ObjectId(paymentId);
									let pushreftorooms = await Entity.RoomsEntity.updateOne(
										{ _id: roomId },
										{ $set: { service: convertedServiceId, payment: convertedPaymentId } },
									);
								});
							});
						});
					}
				})
				.then(() => {
					//  sai sai sai
					const result = {
						buildings: {
							buildingadress: data.address,
							roomquantity: data.roomquantity,
							ownername: data.ownername,
							managername: data.managername,
						},
					};
					cb(null, 'created succesfully');
				});
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
		});
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
