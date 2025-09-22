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
		const monthQuery = parseInt(data.month);
		const yearQuery = parseInt(data.year);
	} catch (error) {
		next(error);
	}
};

// get fees create invoice
exports.getFeeForGenerateInvoice = async (data, cb, next) => {
	try {
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
				$match:
					/**
					 * query: The query in MQL.
					 */
					{
						_id: roomObjectId,
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
				$lookup: {
					from: 'debts',
					localField: '_id',
					foreignField: 'room',
					as: 'debtsInfo',
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$status', 'pending'],
								},
							},
						},
					],
				},
			},
			{
				$project: {
					_id: 1,
					roomIndex: 1,
					feeInfo: 1,
					debtsInfo: 1,
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
																		$eq: ['$$recentFee.unit', 'index'],
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
						debtsInfo: '$debtsInfo',
					},
					feeInfo: {
						$push: {
							_id: '$feeInfo._id',
							feeName: '$feeInfo.feeName',
							unit: '$feeInfo.unit',
							feeAmount: '$feeInfo.feeAmount',
							feeKey: '$feeInfo.feeKey',
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
		const { fees, stayDays } = data;
		let roomId = mongoose.Types.ObjectId(`${data.roomId}`);
		let buildingId = mongoose.Types.ObjectId(data.buildingId);

		const roomFeeInfo = await new Promise((resolve, reject) => {
			exports.getFeeForGenerateInvoice(
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
			const { debtsInfo } = roomFeeInfo?._id || {};
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
		const calculateInvoiceTotalAmount = () => {
			const totalFeeAmount = roomFeeInfo?.feeInfo.reduce((sum, fee) => {
				let currentFeeAmount = Number(fee.feeAmount);
				if (fee.unit === 'index') {
					let feeIndexRequestValue = fees.find((data) => data._id == fee._id);

					return sum + (Number(feeIndexRequestValue.secondIndex) - Number(feeIndexRequestValue.firstIndex)) * currentFeeAmount;
				}
				if (fee.unit === 'person') {
					return sum + currentFeeAmount * fee.customerInfo?.length;
				}
				if (fee.unit === 'room') {
					return sum + currentFeeAmount;
				}
				if (fee.unit === 'vehicle') {
					return sum + currentFeeAmount * fee.vehicleInfo?.length;
				}

				return sum;
			}, 0);

			const rentalAmount = Number(roomFeeInfo?._id.rent);

			let debtsTotalAmount = 0;
			if (roomFeeInfo?._id.debtsInfo.length > 0) {
				debtsTotalAmount = roomFeeInfo?._id.debtsInfo.reduce((sum, debt) => sum + Number(debt.amount), 0);
			}

			return ((totalFeeAmount + rentalAmount + debtsTotalAmount) / 30) * dayOfStay;
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
						quantity: data.vehicleInfo?.length,
						amount: Number(data.feeAmount) * data.vehicleInfo?.length,
						feeKey: data.feeKey,
					};
				}
				if (data.unit === 'person') {
					return {
						feeName: data.feeName,
						unit: data.unit,
						quantity: data.customerInfo?.length,
						amount: Number(data.feeAmount) * data.customerInfo?.length,
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
				feeKey: 'SPEC100PH', //
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
			total: calculateInvoiceTotalAmount(),
			debts: getDebts(),
			paymentContent: generatePaymentContent(),
			payer: contractOwnerInfo?.fullName,
			locked: false,
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
	MongoConnect.Connect(config.database.fullname)
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
				$sort: {
					'roomInfo.roomIndex': 1,
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

exports.generateFirstInvoice = async (data, cb, next) => {
	try {
		console.log('log of fees from generateFirstInvoice: ', data.fees);
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const calculateFeeIndexTotalAmount = (firstIndex, lastIndex, feeAmount) => {
			return (Number(lastIndex) - Number(firstIndex)) * Number(feeAmount);
		};

		const newFees = data.fees
			.map((fee, index) => {
				if (fee.unit === 'index') {
					return {
						feeName: fee.feeName,
						unit: fee.unit,
						firstIndex: fee.firstIndex,
						lastIndex: fee.lastIndex,
						amount: calculateFeeIndexTotalAmount(fee.firstIndex, fee.lastIndex, fee.feeAmount),
						feeKey: fee.feeKey,
					};
				}
				if (fee.unit === 'vehicle') {
					return {
						feeName: fee.feeName,
						unit: fee.unit,
						quantity: data.vehicleAmount,
						amount: Number(fee.feeAmount) * data.vehicleAmount,
						feeKey: fee.feeKey,
					};
				}
				if (fee.unit === 'person') {
					return {
						feeName: fee.feeName,
						unit: fee.unit,
						quantity: data.customerAmount,
						amount: Number(fee.feeAmount) * data.customerAmount,
						feeKey: fee.feeKey,
					};
				}
				if (fee.unit === 'room') {
					return {
						feeName: fee.feeName,
						unit: fee.unit,
						amount: Number(fee.feeAmount),
						feeKey: fee.feeKey,
					};
				} else {
					throw new Error('Thuộc tính của phí không được định nghĩa !');
				}
			})
			.filter(Boolean); // Loại bỏ phần tử null hoặc undefined

		newFees.unshift({
			feeName: 'Tiền phòng',
			amount: data.rent,
			unit: 'room',
			feeKey: 'SPEC100PH',
		});

		const calculateInvoiceTotalAmount = () => {
			console.log('log of newFees: ', newFees);
			const totalFeeAmount = newFees.reduce((sum, fee) => {
				if (fee.unit === 'index') {
					return sum + fee.amount;
				}
				if (fee.unit === 'person') {
					return sum + fee.amount;
				}
				if (fee.unit === 'room') {
					return sum + fee.amount;
				}
				if (fee.unit === 'vehicle') {
					return sum + fee.amount;
				}

				return sum;
			}, 0);

			return (totalFeeAmount / 30) * Number(data.stayDays);
		};

		console.log('log of calculateInvoiceTotalAmount: ', calculateInvoiceTotalAmount());

		const newInvoice = {
			stayDays: Number(data.stayDays),
			month: currentPeriod?.currentMonth,
			year: currentPeriod?.currentYear,
			room: roomObjectId,
			status: 'unpaid',
			fee: newFees,
			total: calculateInvoiceTotalAmount(),
			debts: [],
			paymentContent: generatePaymentContent(),
			payer: data.payer,
			locked: false,
		};

		let generateInvoice = await Entity.InvoicesEntity.create(newInvoice);
		cb(null, generateInvoice);
	} catch (error) {
		next(error);
	}
};

exports.collectCashMoney = async (data, cb, next) => {
	let session;
	try {
		const invoiceObjectId = mongoose.Types.ObjectId(data.invoiceId);
		const collectorObjectId = mongoose.Types.ObjectId(data.userId);

		const currentInvoice = await Entity.InvoicesEntity.aggregate([
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
		]);

		if (currentInvoice.length == 0) {
			throw new Error(`Không tồn tại hóa đơn ${data.invoiceId}`);
		}

		const createTransaction = await Entity.TransactionsEntity.create({
			transactionDate: data.date,
			amount: data.amount,
			paymentMethod: 'cash',
			invoice: invoiceObjectId,
			collector: collectorObjectId,
			transferType: 'credit',
		});

		var totalTransactionAmount;
		const { transactionInfo, total: currentInvoiceAmount } = currentInvoice[0];
		if (transactionInfo?.length > 0) {
			totalTransactionAmount = transactionInfo.reduce((sum, item) => {
				return sum + item.amount;
			}, 0);
		} else {
			totalTransactionAmount = 0;
		}

		const updatedTotalPaid = totalTransactionAmount + createTransaction.amount;
		const remainingAmount = currentInvoiceAmount - updatedTotalPaid;

		let status = 'unpaid';
		if (remainingAmount <= 0) {
			status = 'paid';
		} else if (remainingAmount > 0 && updatedTotalPaid > 0) {
			status = 'partial';
		}

		await Entity.InvoicesEntity.updateOne({ _id: invoiceObjectId }, { $set: { status } });

		cb(null, 'success');
	} catch (error) {
		next(error);
	}
};

// ROLE CUSTOMERS
exports.getInvoiceInfoByInvoiceCode = async (data, cb, next) => {
	try {
		const [invoiceInfo] = await Entity.InvoicesEntity.aggregate([
			{
				$match: {
					invoiceCode: { $regex: new RegExp(`^${data.billCode}$`, 'i') },
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: 'room',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								_id: 1,
								roomIndex: 1,
								building: 1,
							},
						},
					],
					as: 'roomInfo',
				},
			},
			{
				$addFields:
					/**
					 * newField: The new field name.
					 * expression: The new field expression.
					 */
					{
						buildingId: {
							$getField: {
								field: 'building',
								input: {
									$arrayElemAt: ['$roomInfo', 0],
								},
							},
						},
					},
			},
			{
				$lookup: {
					from: 'banks',
					let: {
						buildingObjectId: '$buildingId',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$$buildingObjectId', '$building'],
								},
							},
						},
					],
					as: 'transferInfo',
				},
			},
			{
				$project:
					/**
					 * specifications: The fields to
					 *   include or exclude.
					 */
					{
						_id: 1,
						stayDays: 1,
						total: 1,
						status: 1,
						locked: 1,
						month: 1,
						year: 1,
						room: 1,
						fee: 1,
						debts: 1,
						paymentContent: 1,
						payer: 1,
						invoiceCode: 1,
						note: 1,
						createdAt: 1,
						roomIndex: {
							$getField: {
								field: 'roomIndex',
								input: {
									$arrayElemAt: ['$roomInfo', 0],
								},
							},
						},
						transferInfo: {
							$arrayElemAt: ['$transferInfo', 0],
						},
					},
			},
		]);
		if (invoiceInfo) {
			if (invoiceInfo.status === 'cancelled') return cb({ message: 'Hóa đơn đã bị hủy', status: 200, errorCode: 40010 }, null);
			else return cb(null, { ...invoiceInfo, type: 'invoice' });
		}

		const [receiptInfo] = await Entity.ReceiptsEntity.aggregate([
			{
				$match:
					/**
					 * query: The query in MQL.
					 */
					{
						receiptCode: { $regex: new RegExp(`^${data.billCode}$`, 'i') },
					},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: 'room',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								_id: 1,
								roomIndex: 1,
								building: 1,
							},
						},
					],
					as: 'roomInfo',
				},
			},
			{
				$addFields:
					/**
					 * newField: The new field name.
					 * expression: The new field expression.
					 */
					{
						buildingId: {
							$getField: {
								field: 'building',
								input: {
									$arrayElemAt: ['$roomInfo', 0],
								},
							},
						},
					},
			},
			{
				$lookup: {
					from: 'banks',
					let: {
						buildingObjectId: '$buildingId',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$$buildingObjectId', '$building'],
								},
							},
						},
					],
					as: 'transferInfo',
				},
			},
			{
				$project:
					/**
					 * specifications: The fields to
					 *   include or exclude.
					 */
					{
						_id: 1,

						amount: 1,
						status: 1,
						locked: 1,
						month: 1,
						year: 1,
						room: 1,
						receiptContent: 1,
						paidAmount: 1,

						paymentContent: 1,
						payer: 1,
						invoiceCode: 1,

						roomIndex: {
							$getField: {
								field: 'roomIndex',
								input: {
									$arrayElemAt: ['$roomInfo', 0],
								},
							},
						},
						transferInfo: {
							$arrayElemAt: ['$transferInfo', 0],
						},
					},
			},
		]);

		if (receiptInfo) {
			if (receiptInfo.status != 'cancelled' && receiptInfo.status != 'terminated') return cb(null, { ...receiptInfo, type: 'receipt' });
			else return cb({ message: 'Hóa đơn đã bị hủy', status: 200, errorCode: 40010 }, null);
		}

		return cb({ message: 'Hóa đơn không tồn tại', status: 200, errorCode: 40401 }, null);
	} catch (error) {
		next({ statusCode: 500, message: 'Sever hiện đang bận vui lòng thử lại sau.', errorCode: 5001 });
	}
};
