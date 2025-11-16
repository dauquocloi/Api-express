const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { last, result } = require('underscore');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const generatePaymentContent = require('../utils/generatePaymentContent');
const { CANCELLED, NOT_EXIST } = require('../constants/errorCodes');
const AppError = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const zaloService = require('../service/zalo.service');
const formatPhone = require('../utils/formatPhone');

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
		// let buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		// const currentPeriod = await getCurrentPeriod(buildingObjectId);

		const feeInfo = await Entity.RoomsEntity.aggregate([
			{
				$match: {
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
									$and: [
										{
											$eq: ['$$shouldLookup', true],
										},
										{
											$not: {
												$in: ['$status', [0, 2]],
											},
										},
									],
								},
							},
						},
						{
							$project: {
								_id: 1,
								isContractOwner: 1,
								fullName: 1,
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
									$and: [
										{
											$eq: ['$$shouldLookup', true],
										},
										{
											$not: {
												$in: ['$status', [0, 2]],
											},
										},
									],
								},
							},
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
					customerInfo: 1,
					vehicleInfo: 1,
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
							lastIndex: '$feeInfo.lastIndex',
						},
					},
				},
			},
		]);

		if (!feeInfo || feeInfo.lenth === 0) throw new AppError(errorCodes.invariantViolation, `Phòng không tồn tại trong hệ thống!`, 404);

		cb(null, feeInfo[0]);
	} catch (error) {
		next(error);
	}
};

exports.create = async (data, cb, next) => {
	// ALERT: CẦN UPDATE LẠI CHỈ SỐ CUỐI CỦA DOCUMENT FEE ( DONE )
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const { fees, stayDays } = data;
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const feesObjectIds = fees.map((fee) => mongoose.Types.ObjectId(fee._id));
		const feesFromDb = await Entity.FeesEntity.find({ _id: { $in: feesObjectIds } });
		const getRentAmount = await Entity.ContractsEntity.findOne({ room: roomObjectId, status: 'active' });
		const getDebts = await Entity.DebtsEntity.find(
			{ room: roomObjectId, status: 'pending' },
			{ content: 1, amount: 1, status: 1, room: 1, month: 1, year: 1 },
		);

		if (!getRentAmount) {
			throw new AppError(errorCodes.notExist, 'Phòng không tồn tại trong hệ thống', 400);
		}

		if (feesFromDb.length !== feesObjectIds.length) {
			throw new AppError(errorCodes.invalidInput, 'Dữ liệu đầu vào không hợp lệ', 400);
		}

		const calculateInvoiceTotalAmount = () => {
			const totalFeeAmount = feesFromDb.reduce((sum, fee) => {
				const feeInput = fees.find((f) => f._id.toString() === fee._id.toString());
				if (!feeInput) {
					throw new AppError(errorCodes.invalidInput, 'Dữ liệu đầu vào không hợp lệ', 400);
				}

				if (fee.unit === 'index') {
					const first = Number(feeInput.firstIndex);
					const second = Number(feeInput.secondIndex);

					if (isNaN(first) || isNaN(second) || second < first) {
						throw new AppError(errorCodes.invalidInput, 'Giá trị chỉ số không hợp lệ', 400);
					}
					return sum + (second - first) * fee.feeAmount;
				}
				if (fee.unit === 'person' || fee.unit === 'vehicle') {
					const qty = Number(feeInput.quantity);
					return sum + ((fee.feeAmount * qty) / 30) * stayDays;
				}
				if (fee.unit === 'room') {
					return sum + (fee.feeAmount / 30) * stayDays;
				}

				return sum;
			}, 0);

			let debtsTotalAmount = 0;
			if (getDebts?.length > 0) {
				debtsTotalAmount = getDebts.reduce((sum, debt) => sum + Number(debt.amount), 0);
			}

			let totalRental = (Number(getRentAmount.rent) / 30) * stayDays;

			return totalFeeAmount + debtsTotalAmount + totalRental;
		};

		const calculateFeeIndexTotalAmount = (firstIndex, secondIndex, feeAmount) => {
			return (Number(secondIndex) - Number(firstIndex)) * Number(feeAmount);
		};

		const newFees = [];
		for (const data of feesFromDb) {
			const feeInput = fees.find((f) => f._id.toString() === data._id.toString());
			if (!feeInput) {
				throw new AppError(errorCodes.invalidInput, 'Dữ liệu đầu vào không hợp lệ', 400);
			}
			if (data.unit === 'index') {
				await Entity.FeesEntity.findOneAndUpdate({ _id: data._id }, { lastIndex: Number(feeInput.secondIndex) }).session(session);
				newFees.push({
					feeName: data.feeName,
					unit: data.unit,
					firstIndex: feeInput.firstIndex,
					lastIndex: feeInput.secondIndex,
					amount: calculateFeeIndexTotalAmount(feeInput.firstIndex, feeInput.secondIndex, data.feeAmount),
					feeKey: data.feeKey,
					feeAmount: data.feeAmount,
				});
			} else if (data.unit === 'vehicle' || data.unit === 'person') {
				newFees.push({
					feeName: data.feeName,
					unit: data.unit,
					amount: ((data.feeAmount * feeInput.quantity) / 30) * stayDays,
					feeKey: data.feeKey,
					feeAmount: data.feeAmount,
					quantity: feeInput.quantity,
				});
			} else if (data.unit === 'room') {
				newFees.push({
					feeName: data.feeName,
					unit: data.unit,
					amount: (data.feeAmount / 30) * stayDays,
					feeKey: data.feeKey,
					feeAmount: data.feeAmount,
				});
			} else {
				throw new AppError(errorCodes.invariantViolation, 'Thuộc tính của phí không được đĩnh nghĩa!', 200);
			}
		}

		newFees.push({
			feeName: 'Tiền phòng',
			unit: 'room',
			amount: (getRentAmount.rent / 30) * stayDays,
			feeAmount: getRentAmount.rent,
			feeKey: 'SPEC100PH',
		});

		const currentPeriod = await getCurrentPeriod(buildingObjectId);

		const [customerInfo] = await Entity.CustomersEntity.aggregate([
			{
				$match: {
					room: roomObjectId,
					isContractOwner: true,
				},
			},
			{
				$project: {
					_id: 1,
					fullName: 1,
					phone: 1,
					gender: 1,
				},
			},
		]).session(session);

		if (!customerInfo) throw new AppError(errorCodes.notExist, `Phòng không tồn tại chủ hợp đồng!`, 404);

		const paymentContent = await generatePaymentContent(process.env.PAYMENT_CONTENT_LENGTH);
		const invoiceCode = await generatePaymentContent(process.env.INVOICE_CODE_LENGTH);

		const [newInvoice] = await Entity.InvoicesEntity.create(
			[
				{
					stayDays: data.stayDays,
					month: currentPeriod?.currentMonth,
					year: currentPeriod?.currentYear,
					room: roomObjectId,
					status: 'unpaid',
					fee: newFees,
					total: calculateInvoiceTotalAmount(),
					paidAmount: 0,
					debts: getDebts,
					paymentContent,
					invoiceCode,
					invoiceContent: `Hóa đơn tiền nhà kỳ ${currentPeriod.currentMonth}, ${currentPeriod.currentYear}`,
					payer: customerInfo.fullName,
					locked: false,
					invoiceType: 'rental',
				},
			],
			{ session },
		);

		if (!newInvoice) throw new AppError(50001, 'Có lỗi trong quá tình tạo hóa đơn', 500);

		await Entity.DebtsEntity.updateMany(
			{ room: roomObjectId },
			{ $set: { sourceId: newInvoice._id, sourceType: 'invoice', status: 'closed' } },
			{ session },
		);

		// const getAccessToken = await Entity.OATokensEntity.findOne({ oaId: data.oaId });

		// if (!getAccessToken) throw new AppError(50001, 'OA Zalo Chưa được khởi tạo', 200);

		// const znsReqData = {
		// 	phone: formatPhone(customerInfo.phone),
		// 	buildingName: data.buildingName,
		// 	amount: newInvoice.total,
		// 	billCode: newInvoice.invoiceCode,
		// 	senderName: 'Đậu Quốc Lợi',
		// 	customerName: customerInfo.fullName,
		// 	roomIndex: data.roomIndex,
		// 	billStatus: newInvoice.status,
		// };

		// console.log('log of getAccessToken: ', getAccessToken.accessToken);

		// const handleSendZns = await zaloService.sendZNSInvoice(getAccessToken.accessToken, znsReqData, next);

		await session.commitTransaction();
		cb(null, [newInvoice]);
	} catch (error) {
		if (session) await session.abortTransaction();
		next(error);
	} finally {
		if (session) session.endSession();
	}
};

//TEST
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
				$addFields: {
					month: currentMonth,
					year: currentYear,
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
				$sort: {
					'roomInfo.roomIndex': 1,
				},
			},
			{
				$lookup: {
					from: 'invoices',
					let: {
						roomObjectId: '$roomInfo._id',
						month: 5,
						year: 2025,
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$room', '$$roomObjectId'],
										},
										{
											$eq: ['$month', '$$month'],
										},
										{
											$eq: ['$year', '$$year'],
										},
										{
											$not: {
												$in: ['$status', ['cencelled', 'terminated']],
											},
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
						$switch: {
							branches: [
								// nếu mảng invoiceRecent rỗng => chưa có hóa đơn
								{
									case: {
										$eq: [
											{
												$size: '$invoiceRecent',
											},
											0,
										],
									},
									then: false,
								},
								{
									case: {
										$allElementsTrue: {
											$map: {
												input: '$invoiceRecent',
												as: 'inv',
												in: {
													$ne: ['$$inv.invoiceType', 'firstInvoice'],
												},
											},
										},
									},
									then: true,
								},
								{
									case: {
										$gt: [
											{
												$size: '$invoiceRecent',
											},
											1,
										],
									},
									then: true,
								},
								// 2️⃣ createdAt không thuộc tháng hiện tại và stayDays < 30 => false
								{
									case: {
										$anyElementTrue: {
											$map: {
												input: '$invoiceRecent',
												as: 'inv',
												in: {
													$switch: {
														branches: [
															//type === firstInvoice createdAt không cùng tháng & stayDays < 30
															{
																case: {
																	$and: [
																		{
																			$eq: ['$$inv.invoiceType', 'firstInvoice'],
																		},
																		{
																			$ne: [
																				{
																					$month: '$$inv.createdAt',
																				},
																				'$month',
																			],
																		},
																		{
																			$lt: ['$$inv.stayDays', 30],
																		},
																	],
																},
																then: false,
															},
															//type=firstInvoice & createdAt không cùng tháng & stayDays >= 30
															{
																case: {
																	$and: [
																		{
																			$eq: ['$$inv.invoiceType', 'firstInvoice'],
																		},
																		{
																			$ne: [
																				{
																					$month: '$$inv.createdAt',
																				},
																				'$month',
																			],
																		},
																		{
																			$gte: ['$$inv.stayDays', 30],
																		},
																	],
																},
																then: true,
															},
															// createdAt cùng tháng
															{
																case: {
																	$eq: [
																		{
																			$month: '$$inv.createdAt',
																		},
																		'$month',
																	],
																},
																then: true,
															},
														],
														default: false,
													},
												},
											},
										},
									},
									then: true,
								},
							],
							default: false,
						},
					},
				},
			},
			{
				$addFields: {
					invoiceId: {
						$cond: [
							{
								$eq: ['$invoiceStatus', true],
							},
							{
								$let: {
									vars: {
										filtered: {
											$filter: {
												input: '$invoiceRecent',
												as: 'inv',
												cond: {
													$ne: ['$$inv.invoiceType', 'firstInvoice'],
												},
											},
										},
									},
									in: {
										$cond: [
											{
												$gt: [
													{
														$size: '$$filtered',
													},
													0,
												],
											},
											{
												$first: '$$filtered._id',
											},
											// nếu có invoice != firstInvoice
											{
												$first: '$invoiceRecent._id',
											}, // nếu tất cả là firstInvoice
										],
									},
								},
							},
							null, // nếu invoiceStatus = false => không có invoiceId
						],
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
							invoiceId: '$invoiceId',
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
			month = Number(data.month);
			year = Number(data.year);
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
										{
											$not: {
												$in: ['$status', ['cencelled', 'terminated']],
											},
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
					currentMonth: Number(month),
					currentYear: Number(year),
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
					invoiceContent: 1,
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
						stayDays: '$stayDays',
						invoiceContent: '$invoiceContent',
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

		if (invoiceDetail.length > 0) {
			const { _id: invoiceInfo, transactionInfo } = invoiceDetail[0];
			if ((invoiceInfo.status === 'unpaid' || invoiceInfo.status === 'partial') && invoiceInfo.locked === false) {
				const bankInfo = await Entity.BanksEntity.findOne({ building: { $in: [buildingObjectId] } });

				cb(null, { invoiceDetail: { ...invoiceInfo, transactionInfo }, paymentInfo: bankInfo });
			} else {
				cb(null, { invoiceDetail: { ...invoiceInfo, transactionInfo }, paymentInfo: null });
			}
		} else {
			throw new AppError(errorCodes.notExist, `Hóa đơn không tồn tại`, 404);
		}
	} catch (error) {
		next(error);
	}
};

exports.generateFirstInvoice = async (data, cb, next) => {
	try {
		// throw new AppError(errorCodes.notExist, 'Phòng không tồn tại', 200);
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

		const paymentContent = await generatePaymentContent(process.env.PAYMENT_CONTENT_LENGTH);

		const newInvoice = {
			stayDays: Number(data.stayDays),
			month: currentPeriod?.currentMonth,
			year: currentPeriod?.currentYear,
			room: roomObjectId,
			status: 'unpaid',
			fee: newFees,
			total: calculateInvoiceTotalAmount(),
			debts: [],
			paymentContent,
			payer: data.payer,
			locked: false,
			invoiceType: 'firstInvoice',
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

		await Entity.InvoicesEntity.updateOne({ _id: invoiceObjectId }, { $set: { status, paidAmount: updatedTotalPaid } });

		cb(null, 'success');
	} catch (error) {
		next(error);
	}
};

exports.modifyInvoice = async (data, cb, next) => {
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const { fees, stayDays } = data;
		const invoiceObjectId = mongoose.Types.ObjectId(data.invoiceId);
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);

		const currentInvoice = await Entity.InvoicesEntity.findOne({ _id: invoiceObjectId }).exec();
		if (!currentInvoice) throw new AppError(errorCodes.notExist, 'Hóa đơn không tồn tại', 404);
		if (currentInvoice.locked === true) throw new AppError(errorCodes.cancelled, 'Hóa đơn đã đóng', 400);

		const calculateInvoiceTotalAmount = () => {
			const totalFeeAmount = fees.reduce((sum, fee) => {
				if (fee.unit === 'index') {
					return sum + (fee.secondIndex - fee.firstIndex) * fee.feeAmount;
				}
				if (fee.unit === 'person' || fee.unit === 'vehicle') {
					return sum + ((fee.feeAmount * fee.quantity) / 30) * stayDays;
				}
				if (fee.unit === 'room') {
					return sum + (fee.feeAmount / 30) * stayDays;
				}

				return sum;
			}, 0);

			let debtsTotalAmount = 0;
			if (currentInvoice.debts?.length > 0) {
				debtsTotalAmount = currentInvoice.debts.reduce((sum, debt) => sum + Number(debt.amount), 0);
			}

			return totalFeeAmount + debtsTotalAmount;
		};

		const calculateFeeIndexTotalAmount = (firstIndex, secondIndex, feeAmount) => {
			return (Number(secondIndex) - Number(firstIndex)) * Number(feeAmount);
		};

		const newFees = [];
		for (const data of fees) {
			if (data.unit === 'index') {
				const updateCurrentFeeIndex = await Entity.FeesEntity.findOneAndUpdate(
					{ room: roomObjectId, feeKey: data.feeKey },
					{ $set: { lastIndex: Number(data.secondIndex) } },
					{ session },
				);
				if (!updateCurrentFeeIndex) throw new AppError(errorCodes.invariantViolation, 'Phí không tồn tại trong hệ thống', 404);
				newFees.push({
					feeName: data.feeName,
					unit: data.unit,
					firstIndex: data.firstIndex,
					lastIndex: data.secondIndex,
					amount: calculateFeeIndexTotalAmount(data.firstIndex, data.secondIndex, data.feeAmount),
					feeAmount: data.feeAmount,
					feeKey: data.feeKey,
				});
			} else if (data.unit === 'vehicle' || data.unit === 'person') {
				newFees.push({
					feeName: data.feeName,
					unit: data.unit,
					quantity: data.quantity,
					amount: ((data.feeAmount * data.quantity) / 30) * stayDays,
					feeAmount: data.feeAmount,
					feeKey: data.feeKey,
				});
			} else if (data.unit === 'room') {
				newFees.push({
					feeName: data.feeName,
					unit: data.unit,
					amount: (data.feeAmount / 30) * stayDays,
					feeAmount: data.feeAmount,
					feeKey: data.feeKey,
				});
			} else {
				throw new AppError(errorCodes.invariantViolation, 'Thuộc tính của phí không được đĩnh nghĩa!', 410);
			}
		}

		const totalInvoice = calculateInvoiceTotalAmount();
		const getInvoiceStatus = () => {
			const paid = currentInvoice.paidAmount;

			if (paid === 0) return 'unpaid';
			if (paid >= totalInvoice) return 'paid';
			return 'partial';
		};

		Object.assign(currentInvoice, { stayDays, fee: newFees, total: totalInvoice, status: getInvoiceStatus() });
		const modifiedInvoice = await currentInvoice.save({ session });
		if (!modifiedInvoice) throw new AppError(errorCodes.invariantViolation, 'Lỗi trong quá trình lưu hóa đơn', 500);

		await session.commitTransaction();
		cb(null, 'success');
	} catch (error) {
		if (session) await session.abortTransaction();
		next(error);
	} finally {
		session.endSession();
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
			if (invoiceInfo.status === 'cancelled') throw new AppError(errorCodes.cancelled, 'Hóa đơn đã bị hủy', 400);
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
			if (receiptInfo.status != 'cancelled' && receiptInfo.status != 'terminated') {
				return cb(null, { ...receiptInfo, type: 'receipt' });
			} else throw new AppError(errorCodes.cancelled, 'Hóa đơn đã bị hủy', 400);
		}

		throw new AppError(errorCodes.notExist, 'Hóa đơn không tồn tại', 404);
	} catch (error) {
		next(error);
	}
};

//owner only
exports.deleteInvoice = async (data, cb, next) => {
	let session;
	try {
		const invoiceObjectId = mongoose.Types.ObjectId(data.invoiceId);

		session = await mongoose.startSession();
		session.startTransaction();

		const invoice = await Entity.InvoicesEntity.findOne({ _id: invoiceObjectId });
		if (!invoice) throw new AppError(errorCodes.notExist, 'Hóa đơn không tồn tại', 404);
		const { fee } = invoice;
		const indexFees = fee.filter((f) => f.unit === 'index');

		const terminateInvoice = async () => {
			await Entity.InvoicesEntity.findOneAndUpdate({ _id: invoiceObjectId }, { $set: { status: 'terminated' } }, { session });
		};

		if (invoice.status === 'paid') {
			await terminateInvoice();
		}
		if (invoice.status === 'unpaid') {
			await terminateInvoice();
			if (indexFees.length > 0) {
				const operations = indexFees.map((f) => ({
					updateOne: {
						filter: {
							feeKey: f.feeKey,
							room: invoice.room,
						},
						update: {
							$set: { lastIndex: Number(f.firstIndex) },
						},
					},
				}));

				await Entity.FeesEntity.bulkWrite(operations, { session });
			}

			if (invoice.debts?.length > 0) {
				await Entity.DebtsEntity.updateMany(
					{ sourceId: invoiceObjectId },
					{ $set: { sourceId: null, status: 'pending', sourceType: 'pending' } },
					{ session },
				);
			}
		}
		if (invoice.status === 'partial') {
			await terminateInvoice();
		}

		await session.commitTransaction();

		cb(null, 'success');
	} catch (error) {
		if (session) await session.abortTransaction();
		next(error);
	} finally {
		if (session) session.endSession();
	}
};
