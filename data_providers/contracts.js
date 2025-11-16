const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { TestUsersEntity } = require('../models/contracts');
const { last, result } = require('underscore');
const generateContract = require('../utils/generateContract');
const listFeeInitial = require('../utils/getListFeeInital');
const { forEachOf } = require('async');
const withSignedUrls = require('../utils/withSignedUrls');
const moment = require('moment');
const AppError = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');

exports.getAll = (data, cb) => {
	MongoConnect.Connect(config.database.fullname)
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

// Piece of shit
exports.create = (data, cb) => {
	// khai báo các biến lưu giá trị {findOne / find / _id}
	let findBuildingByName;
	let BuildingIdByName;
	let findRoomsByBuildingId;
	let RoomIdByIndex;
	MongoConnect.Connect(config.database.fullname)
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
	MongoConnect.Connect(config.database.fullname)
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
	MongoConnect.Connect(config.database.fullname)
		.then((db) => {
			Entity.InvoicesEntity.updateOne({ id: 118 }, { roomid: data.room.roomid }, { new: true }, cb);
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
		});
};

exports.generateContract = async (data, cb, next) => {
	let session;
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		session = await mongoose.startSession();
		session.startTransaction();

		// throw new AppError(errorCodes.invariantViolation, 'Người dùng không tồn tại trong hệ thống!', 200);

		const owner = await Entity.BuildingsEntity.aggregate([
			{
				$match: {
					_id: buildingObjectId,
				},
			},
			{
				$lookup: {
					from: 'users',
					let: {
						ownerIds: {
							$map: {
								input: {
									$filter: {
										input: '$management',
										as: 'manager',
										cond: {
											$eq: ['$$manager.role', 'owner'],
										},
									},
								},
								as: 'owner',
								in: '$$owner.user',
							},
						},
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$_id', '$$ownerIds'],
								},
							},
						},
					],
					as: 'ownerInfo',
				},
			},
			{
				$project: {
					_id: 1,
					buildingAddress: 1,
					ownerInfo: {
						$arrayElemAt: ['$ownerInfo', 0],
					},
				},
			},
		]).session(session);

		if (owner.length === 0) {
			throw new AppError(errorCodes.notExist, `Không tồn tại chủ nhà với id ${data.buildingId}`, 200);
		}

		const currentRoom = await Entity.RoomsEntity.findOne({ _id: roomObjectId }).session(session);
		if (!currentRoom) throw new Error(`Phòng với id ${data.roomId} không tồn tại`);

		console.log('Found room:', currentRoom);
		console.log('Before save:', currentRoom.toObject());
		currentRoom.roomPrice = data.rent;
		currentRoom.roomDeposit = data.depositAmount;
		currentRoom.roomState = 1;
		currentRoom.interior = data.interiors;
		currentRoom.isDeposited = false;

		const modifiedRoom = await currentRoom.save({ session });
		console.log('Room saved successfully: ', modifiedRoom);

		let customersData = data.customers?.map((cus, index) => {
			return {
				fullName: cus.fullName,
				gender: cus.gender,
				isContractOwner: index === 0 ? true : false,
				birthday: cus.dob,
				permanentAddress: cus.address,
				phone: cus.phone,
				avatar: '',
				cccd: cus.cccd,
				cccdIssueDate: cus.cccdIssueDate,
				cccdIssueAt: cus.cccdIssueAt,
				status: 1,
				room: roomObjectId,
				temporaryResidence: false,
				checkinDate: new Date(),
				checkoutDate: data.contractEndDate,
			};
		});

		const createdCustomers = await Entity.CustomersEntity.insertMany(customersData, { session });

		const phoneToCustomerIdMap = new Map();
		for (const customer of createdCustomers) {
			phoneToCustomerIdMap.set(customer.phone, customer._id);
		}

		if (data.vehicles.length > 0) {
			const vehicleData = data.vehicles
				?.map((vehicle) =>
					vehicle.licensePlate?.trim()
						? {
								licensePlate: vehicle.licensePlate,
								fromDate: new Date(),
								owner: phoneToCustomerIdMap.get(vehicle.ownerPhone) || null,
								image: '',
								room: roomObjectId,
								status: 'active',
						  }
						: null,
				)
				.filter(Boolean);
			await Entity.VehiclesEntity.insertMany(vehicleData, { session });
		}

		await Entity.FeesEntity.deleteMany({ room: roomObjectId }, { session });
		const feesData = data.fees
			?.map((fee) => {
				const intialFee = listFeeInitial.find((f) => f.feeKey === fee.feeKey);
				if (!intialFee) return null;

				return {
					feeName: intialFee.feeName,
					feeAmount: fee.feeAmount,
					unit: intialFee.unit,
					lastIndex: intialFee.unit === 'index' ? fee.lastIndex : undefined,
					feeKey: intialFee.feeKey,
					iconPath: intialFee.iconPath,
					room: roomObjectId,
				};
			})
			.filter(Boolean); // lọc bỏ null nếu có
		await Entity.FeesEntity.insertMany(feesData, { session });

		// update depositReceiptType from deposit => incidental
		// await Entity.ReceiptsEntity.findOneAndUpdate({ _id: data.receiptId });

		if (data.depositId) {
			const depositObjectId = mongoose.Types.ObjectId(data.depositId);
			await Entity.DepositsEntity.updateOne({ _id: depositObjectId }, { $set: { status: 'close' } }, { session });
		}

		// const { ownerInfo = {} } = owner[0];
		// const feesContractData = feesData.map((fee) => {
		// 	let getType = () => {
		// 		switch (fee.unit) {
		// 			case 'index':
		// 				return '/Số';
		// 			case 'person':
		// 				return '/Người';
		// 			case 'vehicle':
		// 				return '/Xe';
		// 			case 'room':
		// 				return '/Phòng';
		// 			default:
		// 				return '';
		// 		}
		// 	};
		// 	return {
		// 		NAME: fee.feeName,
		// 		AMOUNT: fee.feeAmount.toString(),
		// 		TYPE: getType(),
		// 	};
		// });
		// const interiorContractData = data.interiors?.map((interior) => ({
		// 	NAME: interior.interiorName,
		// 	QUANT: interior.quantity.toString(),
		// }));
		// const contractDocData = {
		// 	CREATED_DATE: {
		// 		DAY: moment().utcOffset('+07:00').format('DD'),
		// 		MONTH: moment().utcOffset('+07:00').format('MM'),
		// 		YEAR: moment().utcOffset('+07:00').format('YYYY'),
		// 	},
		// 	BUILDING_ADDRESS: owner[0].buildingAddress,
		// 	PARTY_A: {
		// 		FULLNAME: ownerInfo?.fullName,
		// 		DOB: moment(ownerInfo?.birthdate).utcOffset('+07:00').format('DD/MM/YYYY'),
		// 		ADDRESS: ownerInfo?.permanentAddress,
		// 		CCCD: ownerInfo?.cccd,
		// 		CCCD_DATE: moment(ownerInfo?.cccdIssueDate).utcOffset('+07:00').format('DD/MM/YYYY'),
		// 		CCCD_AT: ownerInfo?.cccdIssueAt,
		// 		PHONE: ownerInfo?.phone,
		// 	},
		// 	PARTY_B: {
		// 		FULLNAME: data.customers[0].fullName,
		// 		DOB: moment(data.customers[0].dob).utcOffset('+07:00').format('DD/MM/YYYY'),
		// 		ADDRESS: data.customers[0].address,
		// 		CCCD: data.customers[0].cccd,
		// 		CCCD_DATE: moment(data.customers[0].cccdIssueDate).utcOffset('+07:00').format('DD/MM/YYYY'),
		// 		CCCD_AT: data.customers[0].cccdIssueAt,
		// 		PHONE: data.customers[0].phone,
		// 	},

		// 	FEES: feesContractData,
		// 	INTERIORS: interiorContractData,
		// 	DEPOSIT: data.depositAmount?.toString(),
		// 	SIGN_DATE: {
		// 		DAY: moment(data.contractSignDate).utcOffset('+07:00').format('DD'),
		// 		MONTH: moment(data.contractSignDate).utcOffset('+07:00').format('MM'),
		// 		YEAR: moment(data.contractSignDate).utcOffset('+07:00').format('YYYY'),
		// 	},
		// 	END_DATE: {
		// 		DAY: moment(data.contractEndDate).utcOffset('+07:00').format('DD'),
		// 		MONTH: moment(data.contractEndDate).utcOffset('+07:00').format('MM'),
		// 		YEAR: moment(data.contractEndDate).utcOffset('+07:00').format('YYYY'),
		// 	},
		// 	CONTRACT_TERM: data.contractTerm,
		// 	ROOM_PRICE: data.rent?.toString(),
		// };

		// console.time('generateContract take');
		// const contractPdfUrl = await generateContract(contractDocData, buildingObjectId, session);
		// console.timeEnd('generateContract take');

		// console.log('log of contractPdfUrl: ', contractPdfUrl);

		// const partyA = {
		// 	fullName: ownerInfo.fullName,
		// 	phone: ownerInfo.phone, // Số điện thoại
		// 	cccd: ownerInfo.cccd, // CMND/CCCD
		// 	cccdIssueDate: ownerInfo.cccdIssueDate,
		// 	cccdIssueAt: ownerInfo.cccdIssueAt,
		// 	address: ownerInfo.permanentAddress, // Địa chỉ thường trú
		// 	dob: ownerInfo.birthdate,
		// };
		await Entity.ContractsEntity.create(
			[
				{
					createdAt: new Date(),
					contractAddress: owner[0].buildingAddress,
					// partyA: partyA, //Lấy thông tin chủ nhà
					fees: feesData,
					rent: data.rent,
					deposit: {
						amount: data.depositAmount,
						receipt: data.receipt,
					},
					contractSignDate: data.contractSignDate,
					contractEndDate: data.contractEndDate,
					contractTerm: data.contractTerm,
					status: 'active',
					room: roomObjectId,
					// contractPdfUrl: contractPdfUrl.Key,
				},
			],
			{ session },
		);

		await session.commitTransaction();

		cb(null, 'success');
	} catch (error) {
		if (session) await session.abortTransaction();
		console.log('transactionsAbort');
		next(error);
	} finally {
		if (session) session.endSession();
	}
};

exports.getContractPdfSignedUrl = async (data, cb, next) => {
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);

		const currentContract = await Entity.ContractsEntity.findOne({ room: roomObjectId, status: 'active' });
		if (!currentContract) throw new Error(`Phòng với id: ${data.roomId} không tồn tại`);

		const contractPdfUrl = await withSignedUrls(currentContract, 'contractPdfUrl');

		cb(null, contractPdfUrl.contractPdfUrl);
	} catch (error) {
		next(error);
	}
};
