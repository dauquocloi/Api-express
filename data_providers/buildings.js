const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { result } = require('underscore');

exports.getAll = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			// do things here
			Entity.BuildingsEntity.find({ managername: data.managername }, cb);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.create = (data, cb) => {
	// khai báo các biến sử dụng để lấy id
	let serviceId;
	let buildingId;
	let findRoomid;
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			// building create
			Entity.BuildingsEntity.create({
				buildingname: data.building.nameBuilding,
				buildingadress: data.building.address,
				roomquantity: data.building.roomsnumber,
				ownername: data.building.ownername,
				managername: data.building.managername,
			})
				// room create
				.then((building) => {
					buildingId = building._id;
					let n = data.building.roomsnumber;
					let i = 0;
					for (i; i < n; i++) {
						let roomId;
						Entity.RoomsEntity.create({
							roomindex: i,
							roomprice: data.room.roomprice,
							// roomdeposit: data.room.roomdeposit,
							// roomtypes: data.room.roomtypes,
							// roomacreage: data.room.roomacreage,
							building: buildingId,
						}).then(async (room) => {
							roomId = room._id;
							let serviceCreated = await Entity.ServicesEntity.create({
								room: roomId,
								electric: data.service.electric,
								waterindex: data.service.waterindex,
								motobike: data.service.motobike,
								// elevator: data.service.elevator,
								water: data.service.water,
								generalservice: data.service.generalservice,
							});
							// 	.then(async (service) => {
							// 	serviceId = service._id;
							// 	let invoiceCreated = await Entity.InvoicesEntity.create({
							// 		service: serviceId,
							// 		room: roomId,
							// 		accountnumber: data.invoice.accountnumber,
							// 		accountname: data.invoice.accountname,
							// 		bankname: data.invoice.bankname,
							// 		tranfercontent: data.invoice.tranfercontent,
							// 		note: data.invoice.note,
							// 	});
							// });
						});
					}
				})
				.then(() => {
					const result = {
						buildings: {
							buildingadress: data.building.address,
							roomquantity: data.building.roomquantity,
							ownername: data.building.ownername,
							managername: data.building.managername,
						},
						room: {
							roomprice: data.room.roomprice,
							roomdeposit: data.room.roomdeposit,
							motobikequantity: data.room.motobikequantityv,
							firstelecnumber: data.room.firstelecnumber,
							lastelecnumber: data.room.lastelecnumber,
							firstwatenumber: data.room.firstwaternumber,
							lastwaternumber: data.room.lastwaternumber,
							building: buildingId,
							iswaterpayment: data.room.iswaterpayment,
						},
						// invoice: {
						// 	// service: serviceId,
						// 	firstelecnumber: data.invoice.firstelecnumber,
						// 	lastelecnumber: data.invoice.lastelecnumber,
						// 	accountnumber: data.invoice.accountnumber,
						// 	accountname: data.invoice.accountname,
						// 	bankname: data.invoice.bankname,
						// 	tranfercontent: data.invoice.tranfercontent,
						// 	note: data.invoice.note,
						// },
					};
					cb(null, { result });
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
