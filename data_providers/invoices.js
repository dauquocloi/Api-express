const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { TestUsersEntity } = require('../models/contracts');
const { last, result } = require('underscore');

//  query Invoice by Period
exports.getAll = (data, cb) => {
	const monthQuery = parseInt(data.month);
	const yearQuery = parseInt(data.year);
	const buildingname = data.buildingname;
	const roomindex = data.roomindex;
	let queryInvoce;
	MongoConnect.Connect(config.database.name)
		.then(async (db) => {
			queryInvoce = await Entity.InvoicesEntity.aggregate([
				{
					$addFields: {
						year: { $year: '$period' },
						month: { $month: '$period' },
					},
				},
				{
					$match: {
						year: yearQuery,
						month: monthQuery,
					},
				},
			]);
		})
		.then((result) => {
			console.log(result);
			cb(null, { queryInvoce });
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

// exports.create = (data, cb) => {
// 	let BuildingIdByName;
// 	let RoomIdByIndex;
// 	let findBuildingByName;
// 	let findRoomsByBuildingId;
// 	let invoiceCreate;
// 	MongoConnect.Connect(config.database.name)

// 		.then(async (db) => {
// 			// find Building by Building name
// 			findBuildingByName = await Entity.BuildingsEntity.findOne({ buildingname: data.buildingname }).exec();
// 			BuildingIdByName = findBuildingByName._id;
// 			console.log('this is log of findBuildingByName', BuildingIdByName);

// 			// find Rooms by BuildingId and roomindex
// 			findRoomsByBuildingId = await Entity.RoomsEntity.findOne({ building: BuildingIdByName, roomindex: data.roomindex }).exec();
// 			RoomIdByIndex = findRoomsByBuildingId._id;
// 		})
// 		.then(async () => {
// 			let invoiceCreate = await Entity.InvoicesEntity.create({
// 				room: RoomIdByIndex,
// 				firstelecnumber: data.firstelecnumber,
// 				lastelecnumber: data.lastelecnumber,
// 				firstwaternumber: data.firstwaternumber,
// 				lastwaternumber: data.lastwaternumber,
// 				waterprice: data.waterprice,
// 				motobike: data.motobike,
// 				elevator: data.elevator,
// 				daystay: data.daystay,
// 				paid: data.paid,
// 				period: data.period,
// 			});
// 			cb(null, 'good job em');
// 		})
// 		.catch((err) => {
// 			console.log('rooms_Dataprovider_create: ' + err);
// 			cb(err, null);
// 		});
// };

exports.getByRoomId = (data, cb) => {
	MongoConnect.Connect(config.database.name).then(async (db) => {
		try {
			let roomId = mongoose.Types.ObjectId(`${data.id}`);
			await Entity.RoomsEntity.aggregate(
				[
					{
						$match: {
							_id: roomId,
						},
					},
					{
						$lookup: {
							from: 'fees',
							localField: '_id',
							foreignField: 'room',
							as: 'feeInfo',
						},
					},
					{
						$lookup: {
							from: 'contracts',
							localField: '_id',
							foreignField: 'room',
							as: 'contractInfo',
						},
					},
					{
						$unwind: {
							path: '$contractInfo',
						},
					},
					{
						$unwind: {
							path: '$feeInfo',
							preserveNullAndEmptyArrays: true,
						},
					},
					{
						$addFields: {
							shouldLookupPerson: {
								$eq: ['$feeInfo.unit', 'person'],
							},
							shouldLookupVehicle: {
								$eq: ['$feeInfo.unit', 'vehicle'],
							},
							shouldLookupInvoice: {
								$eq: ['$feeInfo.unit', 'index'],
							},
						},
					},
					{
						$lookup: {
							from: 'customers',
							localField: '_id',
							foreignField: 'room',
							as: 'customerInfo',
							let: {
								shouldLookup: '$shouldLookupPerson',
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$eq: ['$$shouldLookup', true],
										},
									},
								},
							],
						},
					},
					{
						$lookup: {
							from: 'vehicles',
							localField: '_id',
							foreignField: 'room',
							as: 'vehicleInfo',
							let: {
								shouldLookup: '$shouldLookupVehicle',
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$eq: ['$$shouldLookup', true],
										},
									},
								},
							],
						},
					},
					{
						$lookup: {
							from: 'invoices',
							localField: '_id',
							foreignField: 'room',
							as: 'recentInvoice',
							let: {
								shouldLookup: '$shouldLookupInvoice',
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$eq: ['$$shouldLookup', true],
										},
									},
								},
								{
									$sort: {
										year: -1,
										month: -1,
									},
								},
								{
									$limit: 1,
								},
							],
						},
					},
					{
						$project: {
							_id: 1,
							roomIndex: 1,
							feeInfo: 1,
							customerInfo: {
								$filter: {
									input: '$customerInfo',
									as: 'customer',
									cond: {
										$eq: ['$$customer.status', 1],
									},
								},
							},
							vehicleInfo: {
								$filter: {
									input: '$vehicleInfo',
									as: 'vehicle',
									cond: {
										$eq: ['$$vehicle.status', 1],
									},
								},
							},
							recentInvoice: {
								$let: {
									vars: {
										filteredInvoice: {
											$map: {
												input: {
													$ifNull: ['$recentInvoice', []], // Kiểm tra nếu recentInvoice là null hoặc không tồn tại, trả về một mảng rỗng.
												},
												as: 'invoice',
												in: {
													fee: {
														$arrayElemAt: [
															{
																$filter: {
																	input: '$$invoice.fee',
																	as: 'recentFee',
																	cond: {
																		$and: [
																			{
																				$eq: ['$$recentFee.type', 'index'],
																			},
																			{
																				$eq: ['$$recentFee.feeName', '$feeInfo.feeName'],
																			},
																		],
																	},
																},
															},
															0,
														],
													},
												},
											},
										},
									},
									in: {
										$cond: {
											if: {
												$eq: [
													{
														$size: '$$filteredInvoice',
													},
													0,
												],
											},
											// Kiểm tra nếu mảng filteredInvoice rỗng.
											then: null,
											// Nếu mảng rỗng, trả về null.
											else: {
												$arrayElemAt: ['$$filteredInvoice', 0],
											}, // Nếu không rỗng, trả về phần tử đầu tiên.
										},
									},
								},
							},
							rent: '$contractInfo.rent',
						},
					},
					{
						$group: {
							_id: {
								_id: '$_id',
								roomIndex: '$roomIndex',
								rent: '$rent',
							},
							feeInfo: {
								$push: {
									_id: '$feeInfo._id',
									feeName: '$feeInfo.feeName',
									unit: '$feeInfo.unit',
									feeAmount: '$feeInfo.feeAmount',
									customerInfo: {
										$cond: {
											if: {
												$eq: ['$feeInfo.unit', 'person'],
											},
											then: '$customerInfo',
											else: null,
										},
									},
									vehicleInfo: {
										$cond: {
											if: {
												$eq: ['$feeInfo.unit', 'vehicle'],
											},
											then: '$vehicleInfo',
											else: null,
										},
									},
									lastIndex: {
										$cond: {
											if: {
												$and: [
													{
														$eq: ['$feeInfo.unit', 'index'],
													},
													{
														$ne: ['$recentInvoice', null],
													},
												],
											},
											then: '$recentInvoice.fee.lastIndex',
											else: null,
										},
									},
								},
							},
						},
					},
				],
				cb,
			);
		} catch (error) {
			console.log('Lỗi khi lấy thông tin hóa đơn: ', error);
			cb(null, error);
		}
	});
};

exports.create = async (data, cb) => {
	try {
		const db = await MongoConnect.Connect(config.database.name); // Chỉ gọi nếu thực sự cần

		const { feeIndex } = data;
		let roomId = mongoose.Types.ObjectId(`${data.id}`);

		const feeInfo = await new Promise((resolve, reject) => {
			exports.getByRoomId(data, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		});

		if (!feeInfo || feeInfo.length === 0 || !feeInfo[0].feeInfo) {
			throw new Error('Không tìm thấy dữ liệu phí (feeInfo)').then(cb(Error, null));
		}

		const newFees = feeInfo[0].feeInfo
			?.map((data, index) => {
				if (data.unit === 'index' && feeIndex[index] && data.feeName === feeIndex[index]?.feeName) {
					return {
						feeName: data.feeName,
						type: data.unit,
						firstIndex: feeIndex[index].firstIndex,
						lastIndex: feeIndex[index].lastIndex,
						amount: (feeIndex[index].lastIndex - feeIndex[index].firstIndex) * data.feeAmount,
					};
				}
				if (data.unit === 'vehicle') {
					return {
						feeName: data.feeName,
						type: data.unit,
						quantity: data.vehicleInfo?.length,
						amount: data.feeAmount * data.vehicleInfo?.length,
					};
				}
			})
			.filter(Boolean); // Loại bỏ phần tử null hoặc undefined

		if (feeInfo[0] && feeInfo[0]._id?.rent) {
			newFees.unshift({
				feeName: 'Tiền phòng',
				amount: feeInfo[0]._id?.rent,
				type: 'room',
			});
		}

		console.log('log off newFees: ', newFees);

		const newInvoice = new Entity.InvoicesEntity({
			stayDays: data.stayDays,
			month: data.month,
			year: data.year,
			room: roomId,
			status: 'unpaid',
			fee: newFees,
			total: 5769000,
		});

		newInvoice.save((err, result) => {
			if (err) {
				console.error('Lỗi khi lưu hóa đơn:', err.message);
				return cb(err, null);
			}
			console.log('Hóa đơn được lưu thành công!');
			cb(null, result);
		});
	} catch (error) {
		console.error('Lỗi khi tạo hóa đơn:', error);
		cb(error, null);
	}
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
