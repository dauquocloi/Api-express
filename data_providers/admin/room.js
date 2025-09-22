const mongoose = require('mongoose');
const MongoConnect = require('../../utils/MongoConnect');
var Entity = require('../../models');
const bcrypt = require('bcrypt');
const { query } = require('express');
var XLSX = require('xlsx');
const fs = require('fs');
const { log } = require('console');

exports.addManyRooms = async (data, cb, next) => {
	// const session = await mongoose.startSession(); // Bắt đầu transaction
	// session.startTransaction();
	try {
		const db = MongoConnect.Connect(config.database.fullname);
		const { buildingInfo } = data;
		let workBook = XLSX.read(data.roomFile, { type: 'buffer' });
		let workSheet = workBook.Sheets[workBook.SheetNames[0]];
		const jsonData = XLSX.utils.sheet_to_json(workSheet);

		const ownerRecent = await Entity.UsersEntity.findOne({ phone: buildingInfo.ownerPhone });

		if (ownerRecent == null) {
			const encryptedPassword = await bcrypt.hash(buildingInfo.ownerPhone, 5);

			var newOwner = await Entity.UsersEntity.create({
				username: buildingInfo.ownerPhone,
				password: encryptedPassword,
				phone: buildingInfo.ownerPhone,
				role: 'owner',
			});
		}

		const newBuilding = await Entity.BuildingsEntity.create({
			buildingAddress: buildingInfo?.buildingAddress,
			buildingName: buildingInfo?.buildingName,
			roomQuantity: buildingInfo?.roomQuantity,
			management: [
				{
					user: ownerRecent == null ? newOwner._id : ownerRecent._id,
					role: 'owner',
				},
			],
		});

		jsonData.map(async (data) => {
			// console.log('data: ', data);
			// Tạo danh sách nội thất

			let interiorArray = [];
			let i = 1;
			while (`interior${i}` in data) {
				if (data[`interior${i}`] != undefined) {
					interiorArray.push({
						interiorName: data[`interior${i}`],
						quantity: data[`interiorQuantity${i}`],
						interiorRentalDate: data[`interiorRentalDate${i}`],
					});
					i++;
				} else {
					i++;
				}
			}
			i = 1;

			// Tạo phòng
			const newRoom = await Entity.RoomsEntity.create({
				building: newBuilding._id,
				roomIndex: data.roomIndex,
				roomPrice: data.roomPrice,
				roomDeposit: data.roomDeposit,
				roomState: data.roomState,
				interior: interiorArray || [],
			});

			// Tạo danh sách phí phòng
			let feesToCreate = [];
			while (`nameFee${i}` in data) {
				if (data[`nameFee${i}`] != undefined) {
					feesToCreate.push({
						feeName: data[`nameFee${i}`],
						unit: data[`unitFee${i}`],
						feeAmount: data[`amountFee${i}`],
						room: newRoom._id,
					});
					i++;
				} else {
					i++;
				}
			}
			i = 1;
			console.log(feesToCreate);
			if (feesToCreate.length > 0) {
				Entity.FeesEntity.insertMany(feesToCreate)
					.then(() => {
						console.log('All fees created successfully');
					})
					.catch((error) => {
						next(error);
					});
			}

			// Tạo hợp đồng
			await Entity.ContractsEntity.create({
				room: newRoom._id,
				rent: data.rent,
				deposit: data.depositRoom,
				contractSignDate: data.signDate,
				contractEndDate: data.endDate,
				contractTerm: data.contractTerm,
			});

			// Tạo customer - user - vehicle
			while (`customerName${i}` in data) {
				if (data[`customerName${i}`] != undefined) {
					const user = await Entity.UsersEntity.findOne({ username: data[`phone${i}`] });
					if (user) {
						console.log(`User với số điện thoại ${data[`phone${i}`]} đã tồn tại`);
						return next(new Error(`User với số điện thoại ${data[`phone${i}`]} đã tồn tại`));
					}
					// Tạo user mới nếu chưa tồn tại
					const encryptedPassword = await bcrypt.hash(data[`phone${i}`], 5);

					const newUser = await Entity.UsersEntity.create({
						username: data[`phone${i}`],
						password: encryptedPassword,
						phone: data[`phone${i}`],
						role: 'customer',
					});

					const newCustomer = await Entity.CustomersEntity.create({
						// Trả về thông tin khách hàng
						room: newRoom._id,
						user: newUser._id,
						fullName: data[`customerName${i}`],
						phone: data[`phone${i}`],
						gender: data[`sex${i}`],
						birthday: data[`date${i}`],
						cccd: data[`CCCD${i}`],
						cccdIssueDate: data[`issueDate${i}`],
						temoraryResidence: data[`temporaryResidence${i}`],
						permanentAddress: data[`permanentAddress${i}`],
						checkinDate: data[`checkinDate${i}`],
						status: data[`status${i}`],
					});
					if (data[`licensePlate${i}`] != undefined) {
						const newVehicle = await Entity.VehiclesEntity.create({
							owner: newCustomer._id,
							room: newRoom._id,
							licensePlate: data[`licensePlate${i}`],
							fromDate: data[`fromDate${i}`],
							vehicleStatus: data[`vehicleStatus${i}`],
						});
					}
					i++;
				} else {
					i++;
				}
			}
			i = 1;
		});

		await cb(null, 'succesful');
		// await session.commitTransaction();
		// session.endSession();
	} catch (error) {
		// await session.abortTransaction();
		// session.endSession();
		console.log(error);
		next(error);
	}
};
