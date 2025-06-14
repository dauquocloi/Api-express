const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { TestUsersEntity } = require('../models/contracts');
const { last, result } = require('underscore');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const generatePaymentContent = require('../utils/generatePaymentContent');
const customerProvider = require('./customers');
// const { config } = require('dotenv');

//  query Invoice by Period
exports.getAll = (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const monthQuery = parseInt(data.month);
		const yearQuery = parseInt(data.year);
	} catch (error) {
		next(error);
	}
};

// get fees create invoice
exports.getByRoomId = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		let roomObjectId = mongoose.Types.ObjectId(data.roomId);
		let buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const findExistedInvoice = await Entity.InvoicesEntity.findOne({
			room: roomObjectId,
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
		});

		if (findExistedInvoice) {
			throw new Error(`Hóa đơn kỳ ${currentPeriod.currentMonth}, năm${currentPeriod.currentYear} đã tồn tại!`);
		}

		const invoiceRecent = await Entity.RoomsEntity.aggregate([
			{
				$match: {
					_id: roomObjectId,
				},
			},
			{
				$lookup: {
					from: 'contracts',
					let: {
						roomId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$room', '$$roomId'],
										},
										{
											$eq: ['$status', 'active'],
										},
									],
								},
							},
						},
					],
					as: 'contract',
				},
			},
			{
				$lookup: {
					from: 'debts',
					let: {
						roomId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$room', '$$roomId'],
										},
										{
											$eq: ['$status', 'pending'],
										},
									],
								},
							},
						},
					],
					as: 'debts',
				},
			},
			{
				$lookup: {
					from: 'fees',
					localField: '_id',
					foreignField: 'room',
					as: 'fees',
				},
			},
			{
				$unwind: {
					path: '$fees',
				},
			},
			{
				$addFields:
					/**
					 * newField: The new field name.
					 * expression: The new field expression.
					 */
					{
						shouldLookupVehicle: {
							$eq: ['$fees.unit', 'vehicle'],
						},
						shouldLookupPerson: {
							$eq: ['$fees.unit', 'person'],
						},
					},
			},
			{
				$lookup: {
					from: 'vehicles',
					let: {
						roomId: '$_id',
						shouldLookup: '$shouldLookupVehicle',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$room', '$$roomId'],
										},
										{
											$eq: [true, '$$shouldLookup'],
										},
									],
								},
							},
						},
						{
							$project: {
								_id: 1,
							},
						},
					],
					as: 'vehicles',
				},
			},
			{
				$lookup: {
					from: 'customers',
					let: {
						roomId: '$_id',
						shouldLookup: '$shouldLookupPerson',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$room', '$$roomId'],
										},
										{
											$eq: [true, '$$shouldLookup'],
										},
									],
								},
							},
						},
						{
							$project: {
								_id: 1,
							},
						},
					],
					as: 'customers',
				},
			},
			{
				$project: {
					_id: 1,
					roomState: 1,
					roomIndex: 1,
					rent: {
						$getField: {
							field: 'rent',
							input: {
								$arrayElemAt: ['$contract', 0],
							},
						},
					},
					fees: {
						_id: '$fees._id',
						feeName: '$fees.feeName',
						feeAmount: '$fees.feeAmount',
						unit: '$fees.unit',
						lastIndex: '$fees.lastIndex',
						feeKey: '$fees.feeKey',
						vehicles: '$vehicles',
						customers: '$customers',
					},
					debts: 1,
				},
			},
			{
				$group: {
					_id: {
						_id: '$_id',
						roomState: '$roomState',
						rent: '$rent',
						debts: '$debts',
						roomIndex: '$roomIndex',
					},
					feeInfo: {
						$push: {
							_id: '$fees._id',
							feeName: '$fees.feeName',
							feeAmount: '$fees.feeAmount',
							unit: '$fees.unit',
							lastIndex: '$fees.lastIndex',
							feeKey: '$fees.feeKey',
							vehicle: '$fees.vehicles',
							customer: '$fees.customers',
						},
					},
				},
			},
		]);

		if (invoiceRecent.length > 0) {
			cb(null, invoiceRecent[0]);
		} else {
			throw new Error('Can not find invoice !');
		}
	} catch (error) {
		next(error);
	}
};

exports.create = async (data, cb, next) => {
	try {
		const db = await MongoConnect.Connect(config.database.name);

		const { fees, stayDays } = data;
		let roomId = mongoose.Types.ObjectId(`${data.roomId}`);
		let buildingId = mongoose.Types.ObjectId(data.buildingId);

		const roomFeeInfo = await new Promise((resolve, reject) => {
			exports.getByRoomId(
				data,
				(err, result) => {
					if (err) {
						reject(err);
					} else {
						resolve(result);
					}
				},
				next,
			);
		});

		console.log('log of roomFeeInfo from createInvoice: ', roomFeeInfo);

		if (!roomFeeInfo || !roomFeeInfo?.feeInfo) {
			throw new Error('Không tìm thấy dữ liệu phí (feeInfo)');
		}

		const contractOwnerInfo = await new Promise((resolve, reject) => {
			customerProvider.getContractOwnerByRoomId(
				data,
				(err, result) => {
					if (err) {
						reject(err);
					} else {
						resolve(result);
					}
				},
				next,
			);
		});

		const getDebts = () => {
			const { debts: debtsInfo } = roomFeeInfo?._id || {};
			var debts;
			if (debtsInfo.length === 0 || !debtsInfo) {
				debts = [];
				return debts;
			} else {
				debts = debtsInfo.map((debt) => {
					return {
						content: debt.content,
						amount: debt.amount,
					};
				});
				return debts;
			}
		};

		const dayOfStay = Number(stayDays);
		const caculateInvoiceTotalAmount = () => {
			const totalFeeAmount = roomFeeInfo?.feeInfo.reduce((sum, fee) => {
				let currentFeeAmount = Number(fee.feeAmount);
				if (fee.unit === 'index') {
					let feeIndexRequestValue = fees.find((data) => data._id == fee._id);

					return sum + (Number(feeIndexRequestValue.secondIndex) - Number(feeIndexRequestValue.firstIndex)) * currentFeeAmount;
				}
				if (fee.unit === 'person') {
					return sum + currentFeeAmount * fee.customer?.length;
				}
				if (fee.unit === 'room') {
					return sum + currentFeeAmount;
				}
				if (fee.unit === 'vehicle') {
					return sum + currentFeeAmount * fee.vehicle?.length;
				}

				return sum;
			}, 0);

			const rentalAmount = Number(roomFeeInfo?._id.rent);

			let debtsTotalAmount = 0;
			if (roomFeeInfo?._id.debts.length > 0) {
				debtsTotalAmount = roomFeeInfo?._id.debtsInfo.reduce((sum, debt) => sum + Number(debt.amount), 0);
			}

			return ((totalFeeAmount + rentalAmount + debtsTotalAmount) * 30) / dayOfStay;
		};

		const calculateFeeIndexTotalAmount = (firstIndex, secondIndex, feeAmount) => {
			return (Number(secondIndex) - Number(firstIndex)) * Number(feeAmount);
		};

		const newFees = roomFeeInfo?.feeInfo
			.map((data, index) => {
				if (data.unit === 'index') {
					const feeIndexInfo = fees.find((fee) => fee._id == data._id);
					if (data._id == feeIndexInfo?._id) {
						return {
							feeName: data.feeName,
							unit: data.unit,
							firstIndex: feeIndexInfo?.firstIndex,
							lastIndex: feeIndexInfo?.secondIndex,
							amount: calculateFeeIndexTotalAmount(feeIndexInfo?.firstIndex, feeIndexInfo?.secondIndex, data.feeAmount),
							feeKey: data.feeKey,
						};
					}
				}
				if (data.unit === 'vehicle') {
					return {
						feeName: data.feeName,
						unit: data.unit,
						quantity: data.vehicle?.length,
						amount: Number(data.feeAmount) * data.vehicle?.length,
						feeKey: data.feeKey,
					};
				}
				if (data.unit === 'person') {
					return {
						feeName: data.feeName,
						unit: data.unit,
						quantity: data.customer?.length,
						amount: Number(data.feeAmount) * data.customer?.length,
						feeKey: data.feeKey,
					};
				}
				if (data.unit === 'room') {
					return {
						feeName: data.feeName,
						unit: data.unit,
						amount: Number(data.feeAmount),
						feeKey: data.feeKey,
					};
				} else {
					throw new Error('Thuộc tính của phí không được đĩnh nghĩa !');
				}
			})
			.filter(Boolean); // Loại bỏ phần tử null hoặc undefined

		if (roomFeeInfo.feeInfo && roomFeeInfo._id?.rent) {
			newFees.unshift({
				feeName: 'Tiền phòng',
				amount: roomFeeInfo._id?.rent,
				unit: 'room',
				feeKey: 'SPEC100', //
			});
		}

		console.log('log off newFees: ', newFees);

		const currentPeriod = await getCurrentPeriod(buildingId);

		const newInvoice = new Entity.InvoicesEntity({
			stayDays: dayOfStay,
			month: currentPeriod?.currentMonth,
			year: currentPeriod?.currentYear,
			room: roomId,
			status: 'unpaid',
			fee: newFees,
			total: caculateInvoiceTotalAmount(),
			debts: getDebts(),
			paymentContent: generatePaymentContent(),
			payer: contractOwnerInfo?.fullName,
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
		next(error);
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

exports.getInvoiceStatus = async (data, cb, next) => {
	try {
		const dbs = MongoConnect.Connect(config.database.name);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		console.log('log of currentPeriod', currentPeriod);
		const { currentMonth, currentYear } = currentPeriod;

		const invoiceStatus = await Entity.BuildingsEntity.aggregate([
			{
				$match: {
					_id: buildingObjectId,
				},
			},

			{
				$lookup: {
					from: 'rooms',
					localField: '_id',
					foreignField: 'building',
					as: 'roomInfo',
				},
			},
			{
				$unwind: {
					path: '$roomInfo',
				},
			},

			{
				$lookup: {
					from: 'invoices',
					let: {
						roomId: '$roomInfo._id',
						month: currentMonth,
						year: currentYear,
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$room', '$$roomId'],
										},
										{
											$eq: ['$month', '$$month'],
										},
										{
											$eq: ['$year', '$$year'],
										},
									],
								},
							},
						},
					],
					as: 'invoiceRecent',
				},
			},
			{
				$addFields: {
					invoiceStatus: {
						$cond: {
							if: {
								$gt: [
									{
										$size: '$invoiceRecent',
									},
									0,
								],
							},
							then: true,
							else: false,
						},
					},
				},
			},
			{
				$group: {
					_id: '$_id',
					listInvoiceInfo: {
						$push: {
							roomId: '$roomInfo._id',
							roomIndex: '$roomInfo.roomIndex',
							invoiceStatus: '$invoiceStatus',
							roomState: '$roomInfo.roomState',
						},
					},
				},
			},
		]);

		if (invoiceStatus.length > 0) {
			const { listInvoiceInfo } = invoiceStatus[0];
			cb(null, { currentPeriod, listInvoiceInfo });
		} else {
			throw new Error(`Không tìm thấy dữ liệu với buildingId: ${data.buildingId}`);
		}
	} catch (error) {
		next(error);
	}
};

exports.getInvoicesPaymentStatus = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		let month;
		let year;
		if (!data.month || !data.year) {
			const currentPeriod = await getCurrentPeriod(buildingObjectId);
			month = currentPeriod.currentMonth;
			year = currentPeriod.currentYear;
		} else {
			month = data.monthm;
			year = data.year;
		}

		const listInvoicePaymentStatus = await Entity.BuildingsEntity.aggregate([
			{
				$match: {
					_id: buildingObjectId,
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: '_id',
					foreignField: 'building',
					as: 'roomInfo',
				},
			},
			{
				$unwind: {
					path: '$roomInfo',
				},
			},
			{
				$lookup: {
					from: 'invoices',
					localField: 'roomInfo._id',
					foreignField: 'room',
					let: {
						currentMonth: month,
						currentYear: year,
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$month', '$$currentMonth'],
										},
										{
											$eq: ['$year', '$$currentYear'],
										},
									],
								},
							},
						},
					],
					as: 'invoiceInfo',
				},
			},
			{
				$lookup: {
					from: 'transactions',
					let: {
						invoiceId: {
							$arrayElemAt: ['$invoiceInfo', 0],
						},
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$invoice', '$$invoiceId._id'],
								},
							},
						},
					],
					as: 'transactions',
				},
			},
			{
				$project: {
					_id: 1,
					buildingName: 1,
					roomInfo: 1,
					invoiceInfo: {
						$arrayElemAt: ['$invoiceInfo', 0],
					},
					transactions: {
						$map: {
							input: '$transactions',
							as: 'trans',
							in: {
								_id: '$$trans._id',
								paymentMethod: '$$trans.paymentMethod',
								collector: {
									$ifNull: ['$$trans.collector', null],
								},
							},
						},
					},
				},
			},
			{
				$group: {
					_id: '$_id',
					listInvoicePaymentStatus: {
						$push: {
							invoiceId: '$invoiceInfo._id',
							roomIndex: '$roomInfo.roomIndex',
							roomId: '$roomInfo._id',
							total: '$invoiceInfo.total',
							month: '$invoiceInfo.month',
							year: '$invoiceInfo.year',
							status: '$invoiceInfo.status',
							transaction: '$transactions',
						},
					},
				},
			},
		]);

		if (listInvoicePaymentStatus.length > 0) {
			cb(null, {
				currentPeriod: {
					currentMonth: month,
					currentYear: year,
				},
				listInvoicePaymentStatus: listInvoicePaymentStatus[0]?.listInvoicePaymentStatus,
			});
		} else {
			throw new Error(`Danh sách hóa đơn với buildingId: ${data.buildingId} không tồn tại`);
		}
	} catch (error) {
		next(error);
	}
};

exports.getInvoiceDetail = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const invoiceObjectId = mongoose.Types.ObjectId(data.invoiceId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const invoiceDetail = await Entity.InvoicesEntity.aggregate([
			{
				$match: {
					_id: invoiceObjectId,
				},
			},
			{
				$lookup: {
					from: 'transactions',
					localField: '_id',
					foreignField: 'invoice',
					as: 'transactionInfo',
				},
			},
			{
				$unwind: {
					path: '$transactionInfo',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'transactionInfo.collector',
					foreignField: '_id',
					as: 'collectorInfo',
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: 'room',
					foreignField: '_id',
					as: 'room',
				},
			},
			{
				$project: {
					_id: 1,
					stayDays: 1,
					total: 1,
					status: 1,
					month: 1,
					year: 1,
					fee: 1,
					debts: 1,
					payer: 1,
					debts: 1,
					locked: 1,
					fee: 1,
					transactionInfo: 1,
					room: {
						$let: {
							vars: {
								room: {
									$arrayElemAt: ['$room', 0],
								},
							},
							in: {
								_id: '$$room._id',
								roomIndex: '$$room.roomIndex',
							},
						},
					},
					collector: {
						$arrayElemAt: ['$collectorInfo', 0],
					},
				},
			},
			{
				$group: {
					_id: {
						_id: '$_id',
						status: '$status',
						room: '$room',
						total: '$total',
						month: '$month',
						year: '$year',
						paymentContent: '$paymentContent',
						date: '$date',
						payer: '$payer',
						locked: '$locked',
						debts: '$debts',
						fee: '$fee',
					},
					transactionInfo: {
						$push: {
							$cond: [
								{
									$gt: [
										{
											$ifNull: ['$transactionInfo', null],
										},
										null,
									],
								},
								{
									_id: '$transactionInfo._id',
									transactionDate: '$transactionInfo.transactionDate',
									amount: '$transactionInfo.amount',
									content: '$transactionInfo.content',
									paymentMethod: '$transactionInfo.paymentMethod',
									collector: {
										fullName: '$collector.fullName',
										_id: '$collector._id',
									},
									transactionId: '$transactionInfo.transactionId',
								},
								'$$REMOVE',
							],
						},
					},
				},
			},
		]);

		console.log('log of invoiceDetail: ', invoiceDetail);

		if (invoiceDetail.length > 0) {
			const { _id: invoiceInfo, transactionInfo } = invoiceDetail[0];
			if ((invoiceInfo.status === 'unpaid' || invoiceInfo.status === 'partial') && invoiceInfo.locked === false) {
				const bankInfo = await Entity.BanksEntity.findOne({ building: { $in: [buildingObjectId] } });

				cb(null, { invoiceDetail: { ...invoiceInfo, transactionInfo }, paymentInfo: bankInfo });
			} else {
				cb(null, { invoiceDetail: { ...invoiceInfo, transactionInfo }, paymentInfo: null });
			}
		} else {
			throw new Error(`invoice với _id: ${data.invoiceId} không tồn tại`);
		}
	} catch (error) {
		next(error);
	}
};
