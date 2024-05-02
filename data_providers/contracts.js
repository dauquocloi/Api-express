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
	let findroombyindex;
	MongoConnect.Connect(config.database.name)
		.then(async (db) => {
			findroombyindex = await Entity.RoomsEntity.findOne({ _id: data.roomid }).exec();
			let findroombyindex_id = findroombyindex._id;
			console.log('this is log of findroombyindex', findroombyindex_id);
			// hợp đồng
			Entity.ContractsEntity.create({
				namecontractowner: data.namecontractowner,
				// contractsigndate: data.date,
				contractenddate: data.contractEndDate,
				room: findroombyindex_id,
			}).then(async () => {
				let roomUpdated = await Entity.RoomsEntity.updateOne(
					{ _id: findroombyindex_id },
					{
						$set: {
							roomprice: data.room.roomPrice,
							roomdeposit: data.room.roomDeposit,
							roomstate: 1,
							motobikequantity: data.room.motobikequantity,
							iswaterpayment: data.room.isWaterPayment,
						},
					},
					{
						upsert: true,
					},
				)
					.then(async () => {
						const customersData = [
							{
								fullname: data.customer[0].userName,
								phone: data.customer[0].phoneNumber,
								email: data.customer[0].email,
								room: findroombyindex_id,
							},
							{
								fullname: data.customer[1].userName,
								phone: data.customer[1].phoneNumber,
								email: data.customer[1].email,
								room: findroombyindex_id,
							},
							{
								fullname: data.customer[2].userName,
								phone: data.customer[2].phoneNumber,
								email: data.customer[2].email,
								room: findroombyindex_id,
							},
						];
						const customers = customersData.map((userData) => ({
							fullname: userData.fullname,
							gender: userData.gender,
							phone: userData.phone,
							cccd: userData.cccd,
							email: userData.email,
							room: userData.room,
						}));
						let usersCreated = await Entity.CustomersEntity.create(customers);
					})
					.then(async () => {
						let serviceUpdated = await Entity.ServicesEntity.updateOne(
							{ room: findroombyindex_id },
							{
								$set: {
									electric: data.room.electric,
									// waterindex: data.room.waterindex,
									water: data.room.water,
									motobike: data.room.motobike,
									elevator: data.room.elevator,
									generalservice: data.room.generalService,
								},
							},
							{
								upsert: true,
							},
						);
					})
					.then(async () => {
						let invoiceUpdated = await Entity.InvoicesEntity.updateOne(
							{ room: findroombyindex_id },
							{
								$set: {
									firstelecnumber: data.room.firstElecNumber,
									lastelecnumber: data.room.lastElecNumber,
									firstwaternumber: data.room.firstwaternumber,
									lastwaternumber: data.room.lastwaternumber,
									// waterprice: data.invoice.waterprice,
								},
							},
							{
								upsert: true,
							},
						);
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
