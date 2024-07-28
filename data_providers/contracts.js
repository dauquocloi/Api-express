const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { TestUsersEntity } = require('../models/contracts');
const { last, result } = require('underscore');

exports.getAll = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			// do things here
			Entity.ContractsEntity.find({}, cb);
			// Entity.RoomsEntity.aggregate([{ $lookup: { from: 'users', localField: '' } }])
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

// khởi tạo hợp đồng mới + update giá phòng + giá dịch vụ
exports.create = (data, cb) => {
	// khai báo các biến lưu giá trị {findOne / find / _id}
	let findBuildingByName;
	let BuildingIdByName;
	let findRoomsByBuildingId;
	let RoomIdByIndex;
	MongoConnect.Connect(config.database.name)
		.then(async (db) => {
			// find Building by Building name
			findBuildingByName = await Entity.BuildingsEntity.findOne({ buildingname: data.buildingname }).exec();
			BuildingIdByName = findBuildingByName._id;
			console.log('this is log of findBuildingByName', BuildingIdByName);

			// find Rooms by BuildingId and roomindex
			findRoomsByBuildingId = await Entity.RoomsEntity.findOne({ building: BuildingIdByName, roomindex: data.roomindex }).exec();
			RoomIdByIndex = findRoomsByBuildingId._id;
			// Contract create
			Entity.ContractsEntity.create({
				namecontractowner: data.namecontractowner,
				contractsigndate: data.contractSignDate,
				contractenddate: data.contractEndDate,
				room: RoomIdByIndex,
			}).then(async () => {
				let roomUpdated = await Entity.RoomsEntity.updateOne(
					{ _id: RoomIdByIndex },
					{
						$set: {
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
						},
					},
					{
						upsert: true,
					},
				)
					.then(async () => {
						// customer create
						//  arr
						const customers = data.customer.map((userData) => ({
							fullname: userData.fullname,
							gender: userData.gender,
							phone: userData.phone,
							cccd: userData.cccd,
							email: userData.email,
							room: RoomIdByIndex,
						}));
						let usersCreated = await Entity.CustomersEntity.create(customers);
					})
					.then(async () => {
						// update service by roomid
						let serviceUpdated = await Entity.ServicesEntity.updateOne(
							{ room: RoomIdByIndex },
							{
								$set: {
									electric: data.electric,
									waterindex: data.waterindex,
									water: data.water,
									generalservice: data.generalservice,
									iswaterpayment: data.iswaterpayment,
								},
							},
							{
								upsert: true,
							},
						);
					})
					.then(async () => {
						let invoiceUpdated = await Entity.InvoicesEntity.create({
							room: RoomIdByIndex,
							firstelecnumber: data.firstelecnumber,
							lastelecnumber: data.lastelecnumber,
							firstwaternumber: data.firstwaternumber,
							lastwaternumber: data.lastwaternumber,
							waterprice: data.waterprice,
							motobike: data.motobike,
							elevator: data.elevator,
							daystay: data.daystay,
							period: data.period,
							paid: data.paid,
						});
					});
				cb(null, 'good job em');
			});
		})
		.catch((error) => {
			console.error('Error: ', error);
		});
};

exports.updateOne = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			// Entity.ContractsEntity.ContractsEntity.push(data.room.lastelecnumber);
			Entity.ContractsEntity.updateOne({ id: 118 }, { namecontractowner: data.namecontractowner }, { new: true }, cb);
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
		});
};

exports.updateTest = (data, cb) => {
	MongoConnect.Connect(config.database.name)
		.then((db) => {
			Entity.InvoicesEntity.updateOne({ id: 118 }, { roomid: data.room.roomid }, { new: true }, cb);
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
		});
};
