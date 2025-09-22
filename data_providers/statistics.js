const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');

exports.getRevenues = async (data, cb, next) => {
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		var revenueInfo;
		var month;
		var year;
		var status;

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const { currentMonth, currentYear } = currentPeriod;
		if (!data.month || !data.year) {
			month = currentMonth;
			year = currentYear;
			status = 'unlock';
		} else {
			month = parseInt(data.month);
			year = parseInt(data.year);
			if (month == currentMonth && year == currentYear) {
				status = 'unlock';
			} else status = 'lock';
		}

		revenueInfo = await Entity.BuildingsEntity.aggregate([
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
					from: 'contracts',
					let: {
						roomId: '$roomInfo._id',
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
						{
							$project: {
								_id: 1,
								room: 1,
								rent: 1,
								status: 1,
							},
						},
					],
					as: 'rent',
				},
			},
			{
				$lookup: {
					from: 'invoices',
					localField: 'roomInfo._id',
					foreignField: 'room',
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$year', year],
										},
										{
											$eq: ['$month', month],
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
				$unwind: {
					path: '$invoiceInfo',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: 'transactions',
					let: {
						invoiceId: '$invoiceInfo._id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$invoice', '$$invoiceId'],
										},
										{
											$ne: ['$invoice', null],
										},
									],
								},
							},
						},
					],
					as: 'transactionInfo',
				},
			},
			{
				$lookup: {
					from: 'receipts',
					localField: 'roomInfo._id',
					foreignField: 'room',
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$year', year],
										},
										{
											$eq: ['$month', month],
										},
										{
											$in: ['$status', ['partial', 'paid', 'unpaid']],
										},
										{
											$ne: ['$receiptType', 'deposit'],
										},
									],
								},
							},
						},
					],
					as: 'receiptInfo',
				},
			},
			{
				$lookup: {
					from: 'transactions',
					let: {
						receiptId: {
							$map: {
								input: '$receiptInfo',
								as: 'r',
								in: '$$r._id',
							},
						},
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$receipt', '$$receiptId'],
								},
							},
						},
					],
					as: 'transactionReceipt',
				},
			},
			{
				$project: {
					_id: 1,
					buildingName: 1,
					roomInfo: {
						_id: '$roomInfo._id',
						roomIndex: '$roomInfo.roomIndex',
						rent: {
							$getField: {
								field: 'rent',
								input: {
									$arrayElemAt: ['$rent', 0],
								},
							},
						},
						roomState: '$roomInfo.roomState',
					},
					invoiceInfo: {
						_id: '$invoiceInfo._id',
						total: '$invoiceInfo.total',
						status: '$invoiceInfo.status',
						fee: '$invoiceInfo.fee',
						debts: '$invoiceInfo.debts',
						transactionInvoice: {
							$map: {
								input: '$transactionInfo',
								as: 'transaction',
								in: {
									_id: '$$transaction._id',
									invoice: '$$transaction.invoice',
									amount: '$$transaction.amount',
								},
							},
						},
					},
					receiptInfo: {
						$map: {
							input: '$receiptInfo',
							as: 'r',
							in: {
								_id: '$$r._id',
								amount: '$$r.amount',
								status: '$$r.status',
								receiptContent: '$$r.receiptContent',
								transactionReceipt: {
									$map: {
										input: {
											$filter: {
												input: '$transactionReceipt',
												as: 'tr',
												cond: {
													$eq: ['$$tr.receipt', '$$r._id'],
												},
											},
										},
										as: 'tr',
										in: {
											_id: '$$tr._id',
											amount: '$$tr.amount',
											receipt: '$$tr.receipt',
										},
									},
								},
							},
						},
					},
				},
			},
			{
				$group: {
					_id: {
						_id: '$_id',
						buildingName: '$buildingName',
					},
					revenues: {
						$push: {
							_id: '$roomInfo._id',
							roomIndex: '$roomInfo.roomIndex',
							rent: '$roomInfo.rent',
							roomState: '$roomInfo.roomState',
							invoiceInfo: '$invoiceInfo',
							receiptInfo: '$receiptInfo',
						},
					},
				},
			},
			{
				$lookup: {
					from: 'incidentalRevenues',
					let: {
						buildingId: '$_id._id',
						month: month,
						year: year,
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$building', '$$buildingId'],
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
					as: 'otherRevenues',
				},
			},
		]);

		if (revenueInfo.length <= 0) {
			throw new Error(`Không tìm thấy dữ liệu doanh thu của ${data.buildingId}`);
		}

		const unitPriority = {
			room: 1,
			vehicle: 2,
			person: 3,
			index: 4,
			other: 5,
		};
		const { revenues, otherRevenues } = revenueInfo[0];

		let totalPeriodicRevenue = 0;
		const listPeriodicRevenue = [];
		for (const invoiceItem of revenues) {
			if (!Array.isArray(invoiceItem.invoiceInfo) || invoiceItem.invoiceInfo.length === 0) {
				continue;
			}

			for (const invoice of invoiceItem.invoiceInfo) {
				if (!invoice || Object.keys(invoice).length === 0) {
					continue;
				}

				if (invoice.total !== undefined) {
					totalPeriodicRevenue += invoice.total;
				}

				let remaining = invoice.paidAmount;

				invoice.fee?.sort((a, b) => {
					const priorityA = unitPriority[a.unit] || Infinity;
					const priorityB = unitPriority[b.unit] || Infinity;

					if (priorityA !== priorityB) {
						return priorityA - priorityB;
					}
					return b.amount - a.amount;
				});

				for (const feeItem of invoice.fee ?? []) {
					let cost = feeItem.amount;
					const actualPaid = Math.min(remaining, cost);

					let paidAmount = 0;

					if (remaining === 0) {
						paidAmount = 0;
					} else if (actualPaid === cost) {
						paidAmount = cost;
					} else if (actualPaid === remaining) {
						paidAmount = remaining;
					}

					listPeriodicRevenue.push({
						feeName: feeItem.feeName,
						amount: paidAmount,
						unit: feeItem.unit,
						feeKey: feeItem.feeKey,
					});

					remaining -= actualPaid;
				}

				if (!invoice.debts || invoice.debts.length == 0) {
					listPeriodicRevenue.push({
						feeName: 'nợ',
						amount: 0,
						unit: 'room',
						feeKey: 'SPEC101PH',
					});
					continue;
				}

				for (const debt of invoice.debts) {
					let debtAmount = debt.amount;

					const actualDebtPaid = Math.min(remaining, debtAmount);

					let debtPaidAmount = 0;
					if (remaining === 0) {
						debtPaidAmount = 0;
					} else if (actualDebtPaid == debtAmount) {
						debtPaidAmount = debtAmount;
					} else if (actualDebtPaid == remaining) {
						debtPaidAmount = remaining;
					}

					listPeriodicRevenue.push({
						feeName: 'nợ',
						amount: debtPaidAmount,
						unit: 'room',
						feeKey: 'SPEC101PH',
					});

					remaining -= actualDebtPaid;
				}
			}
		}

		const groupedListPeriodic = listPeriodicRevenue.reduce((acc, curr) => {
			const key = curr.feeKey || 'SPEC100PH'; // fallback nếu feeKey không có

			if (!acc[key]) {
				acc[key] = {
					feeName: curr.feeName,
					amount: 0,
					unit: curr.unit,
					feeKey: key,
				};
			}

			acc[key].amount += curr.amount;
			return acc;
		}, {});

		const periodicRevenueMap = new Map();

		Object.values(groupedListPeriodic).forEach((fee) => {
			const trimmedKey = fee.feeKey.slice(0, -2);

			if (periodicRevenueMap.has(trimmedKey)) {
				const existing = periodicRevenueMap.get(trimmedKey);
				existing.amount += fee.amount;
			} else {
				periodicRevenueMap.set(trimmedKey, {
					feeName: fee.feeName,
					amount: fee.amount,
					unit: fee.unit,
					feeKey: trimmedKey,
				});
			}
		});

		// convert Map về mảng
		const finalResult = Array.from(periodicRevenueMap.values());
		const periodicRevenue = finalResult.filter((fee) => fee.amount != 0);
		console.log('log of periodicRevenue: ', periodicRevenue);

		// ----INCIDENTAL REVENUE ------//
		let totalIncidentalRevenue = 0;
		const listIncidentalRevenue = [];
		for (const invoiceItem of revenues) {
			for (const receiptItem of invoiceItem.receiptInfo) {
				if (!receiptItem.receiptContent) continue;

				const { amount = 0, status, transactionReceipt = [], _id, receiptContent } = receiptItem;

				totalIncidentalRevenue += amount;

				const totalPaid = transactionReceipt.reduce((sum, item) => sum + item.amount, 0);

				if (transactionReceipt.length === 0 && status === 'unpaid') continue;

				const paidAmount = status === 'paid' ? amount : Math.min(amount, totalPaid);

				listIncidentalRevenue.push({
					receiptContent,
					amount: paidAmount,
					_id,
				});
			}
		}

		// --- OTHER REVENUE ---//
		const totalOtherRevenue = otherRevenues.reduce((sum, item) => sum + item.amount, 0);

		const calculateTotalRevenue = () => {
			console.log('log of totalIncidental: ', totalIncidentalRevenue);
			console.log('log of totalPeriodc: ', totalPeriodicRevenue);
			return totalIncidentalRevenue + totalPeriodicRevenue + totalOtherRevenue;
		};

		const calculateActualTotalRevenue = () => {
			let totalPeriodicRevenue;
			let totalIncidentalRevenue;
			if (listPeriodicRevenue.length > 0) {
				totalPeriodicRevenue = listPeriodicRevenue.reduce((sum, item) => {
					return sum + item.amount;
				}, 0);
			} else if (listPeriodicRevenue <= 0) {
				totalPeriodicRevenue = 0;
			}

			if (listIncidentalRevenue.length > 0) {
				totalIncidentalRevenue = listIncidentalRevenue.reduce((sum, item) => {
					return sum + item.amount;
				}, 0);
			} else if (listIncidentalRevenue <= 0) {
				totalIncidentalRevenue = 0;
			}

			return totalPeriodicRevenue + totalIncidentalRevenue + totalOtherRevenue;
		};

		console.log('log of calculateTotalRevenue: ', calculateTotalRevenue());

		cb(null, {
			periodicRevenue,
			incidentalRevenue: listIncidentalRevenue,
			totalRevenue: calculateTotalRevenue(),
			actualTotalRevenue: calculateActualTotalRevenue(),
			period: { month: month, year: year },
			otherRevenue: otherRevenues,
			status: status,
		});
	} catch (error) {
		next(error);
	}
};

exports.getRevenuesModified = async (data, cb, next) => {
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);
		var revenueInfo;
		var month;
		var year;
		var status;

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const { currentMonth, currentYear } = currentPeriod;
		if (!data.month || !data.year) {
			month = currentMonth;
			year = currentYear;
			status = 'unlock';
		} else {
			month = parseInt(data.month);
			year = parseInt(data.year);
			if (month == currentMonth && year == currentYear) {
				status = 'unlock';
			} else status = 'lock';
		}

		revenueInfo = await Entity.BuildingsEntity.aggregate([
			{
				$match:
					/**
					 * query: The query in MQL.
					 */
					{
						_id: buildingObjectId,
					},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: '_id',
					foreignField: 'building',
					as: 'rooms',
				},
			},
			{
				$unwind:
					/**
					 * path: Path to the array field.
					 * includeArrayIndex: Optional name for index.
					 * preserveNullAndEmptyArrays: Optional
					 *   toggle to unwind null and empty values.
					 */
					{
						path: '$rooms',
					},
			},
			{
				$lookup: {
					from: 'invoices',
					let: {
						roomId: '$rooms._id',
						month: month,
						year: year,
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
					as: 'invoiceInfo',
				},
			},
			{
				$lookup: {
					from: 'receipts',
					let: {
						roomId: '$rooms._id',
						month: month,
						year: year,
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$cond: [
										{
											$eq: ['$receiptType', 'deposit'],
										},
										//then
										{
											$and: [
												{
													$eq: ['$room', '$$roomId'],
												},
												{
													$eq: ['$isActive', true],
												},
												{
													$lt: ['$carriedOverPaidAmount', '$amount'],
												},
											],
										},
										//else
										{
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
												{
													$in: ['$status', ['paid', 'partial', 'unpaid']],
												},
											],
										},
									],
								},
							},
						},
					],
					as: 'receiptInfo',
				},
			},
			{
				$lookup: {
					from: 'transactions',
					let: {
						receiptId: {
							$map: {
								input: '$receiptInfo',
								as: 'r',
								in: '$$r._id',
							},
						},
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$receipt', '$$receiptId'],
								},
							},
						},
					],
					as: 'transactionReceipt',
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
						buildingName: 1,
						roomInfo: {
							_id: '$rooms._id',
							roomIndex: '$rooms.roomIndex',
							roomState: '$rooms.roomState',
						},
						invoiceInfo: {
							$map: {
								input: '$invoiceInfo',
								as: 'invoiceInfo',
								in: {
									_id: '$$invoiceInfo._id',
									total: '$$invoiceInfo.total',
									paidAmount: '$$invoiceInfo.paidAmount',
									status: '$$invoiceInfo.status',
									fee: '$$invoiceInfo.fee',
									debts: '$$invoiceInfo.debts',
								},
							},
						},
						receiptInfo: {
							$map: {
								input: '$receiptInfo',
								as: 'r',
								in: {
									_id: '$$r._id',
									amount: '$$r.amount',
									status: '$$r.status',
									receiptContent: '$$r.receiptContent',
									receiptContentDetail: '$$r.receiptContentDetail',
									receiptType: '$$r.receiptType',
									paidAmount: '$$r.paidAmount',
									transactionReceipt: {
										$map: {
											input: {
												$filter: {
													input: '$transactionReceipt',
													as: 'tr',
													cond: {
														$eq: ['$$tr.receipt', '$$r._id'],
													},
												},
											},
											as: 'tr',
											in: {
												_id: '$$tr._id',
												amount: '$$tr.amount',
												receipt: '$$tr.receipt',
												month: '$$tr.month',
												year: '$$tr.year',
												paymentMethod: '$$tr.paymentMethod',
											},
										},
									},
								},
							},
						},
					},
			},
			{
				$group:
					/**
					 * _id: The id of the group.
					 * fieldN: The first field name.
					 */
					{
						_id: '$_id',
						revenues: {
							$push: {
								roomId: '$roomInfo._id',
								roomIndex: '$roomInfo.roomIndex',
								roomState: '$roomInfo.roomState',
								invoiceInfo: '$invoiceInfo',
								receiptInfo: '$receiptInfo',
							},
						},
					},
			},
			{
				$lookup:
					/**
					 * from: The target collection.
					 * localField: The local join field.
					 * foreignField: The target join field.
					 * as: The name for the results.
					 * pipeline: Optional pipeline to run on the foreign collection.
					 * let: Optional variables to use in the pipeline field stages.
					 */
					{
						from: 'incidentalRevenues',
						let: {
							buildingId: '$_id',
							month: month,
							year: year,
						},
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{
												$eq: ['$$buildingId', '$building'],
											},
											{
												$eq: ['$$month', '$month'],
											},
											{
												$eq: ['$$year', '$year'],
											},
										],
									},
								},
							},
						],
						as: 'otherRevenues',
					},
			},
		]);

		if (revenueInfo.length <= 0) {
			throw new Error(`Dữ liệu doanh thu tháng ${month}, nằm ${year} không tồn tại`);
		}

		const unitPriority = {
			room: 1,
			vehicle: 2,
			person: 3,
			index: 4,
			other: 5,
		};
		const { revenues, otherRevenues } = revenueInfo[0];

		// ----PERIODIC REVENUES----//
		let totalPeriodicRevenue = 0;
		const listPeriodicRevenue = [];
		for (const invoiceItem of revenues) {
			if (!Array.isArray(invoiceItem.invoiceInfo) || invoiceItem.invoiceInfo.length === 0) {
				continue;
			}

			for (const invoice of invoiceItem.invoiceInfo) {
				if (!invoice || Object.keys(invoice).length === 0) {
					continue;
				}

				if (invoice.total !== undefined) {
					totalPeriodicRevenue += invoice.total;
				}

				let remaining = invoice.paidAmount;

				invoice.fee?.sort((a, b) => {
					const priorityA = unitPriority[a.unit] || Infinity;
					const priorityB = unitPriority[b.unit] || Infinity;

					if (priorityA !== priorityB) {
						return priorityA - priorityB;
					}
					return b.amount - a.amount;
				});

				for (const feeItem of invoice.fee ?? []) {
					let cost = feeItem.amount;
					const actualPaid = Math.min(remaining, cost);

					let paidAmount = 0;

					if (remaining === 0) {
						paidAmount = 0;
					} else if (actualPaid === cost) {
						paidAmount = cost;
					} else if (actualPaid === remaining) {
						paidAmount = remaining;
					}

					listPeriodicRevenue.push({
						feeName: feeItem.feeName,
						amount: paidAmount,
						unit: feeItem.unit,
						feeKey: feeItem.feeKey,
					});

					remaining -= actualPaid;
				}

				if (!invoice.debts || invoice.debts.length == 0) {
					listPeriodicRevenue.push({
						feeName: 'nợ',
						amount: 0,
						unit: 'room',
						feeKey: 'SPEC101PH',
					});
					continue;
				}

				for (const debt of invoice.debts) {
					let debtAmount = debt.amount;

					const actualDebtPaid = Math.min(remaining, debtAmount);

					let debtPaidAmount = 0;
					if (remaining === 0) {
						debtPaidAmount = 0;
					} else if (actualDebtPaid == debtAmount) {
						debtPaidAmount = debtAmount;
					} else if (actualDebtPaid == remaining) {
						debtPaidAmount = remaining;
					}

					listPeriodicRevenue.push({
						feeName: 'nợ',
						amount: debtPaidAmount,
						unit: 'room',
						feeKey: 'SPEC101PH',
					});

					remaining -= actualDebtPaid;
				}
			}
		}

		const groupedListPeriodic = listPeriodicRevenue.reduce((acc, curr) => {
			const key = curr.feeKey || 'SPEC100PH'; // fallback nếu feeKey không có

			if (!acc[key]) {
				acc[key] = {
					feeName: curr.feeName,
					amount: 0,
					unit: curr.unit,
					feeKey: key,
				};
			}

			acc[key].amount += curr.amount;
			return acc;
		}, {});

		const periodicRevenueMap = new Map();

		Object.values(groupedListPeriodic).forEach((fee) => {
			const trimmedKey = fee.feeKey.slice(0, -2);

			if (periodicRevenueMap.has(trimmedKey)) {
				const existing = periodicRevenueMap.get(trimmedKey);
				existing.amount += fee.amount;
			} else {
				periodicRevenueMap.set(trimmedKey, {
					feeName: fee.feeName,
					amount: fee.amount,
					unit: fee.unit,
					feeKey: trimmedKey,
				});
			}
		});

		// convert Map về mảng
		const periodicRevenue = Array.from(periodicRevenueMap.values());
		console.log('log of periodicRevenue: ', periodicRevenue);

		console.log('log of listPeriodicRevenue: ', listPeriodicRevenue);

		// ----INCIDENTAL REVENUE ------//
		let totalIncidentalRevenue = 0;
		const listIncidentalRevenue = [];
		for (const room of revenues) {
			for (const receiptItem of room.receiptInfo) {
				if (!receiptItem.receiptContent) continue;

				const { amount = 0, status, _id, paidAmount = 0 } = receiptItem;

				let totalOlderAmountDepositReceipt = 0;
				let depositReceiptPaidAmount = 0;
				if (receiptItem.receiptType === 'deposit') {
					// we work here
					console.log('log of transaction receipt: ', receiptItem.transactionReceipt);
					totalOlderAmountDepositReceipt =
						receiptItem.transactionReceipt?.reduce((sum, { month: transactionMonth, year: transactionYear, amount = 0 }) => {
							if (!transactionMonth || !transactionYear) return sum;
							if (transactionYear < year || (transactionYear === year && transactionMonth < month)) {
								return sum + amount;
							}
							return sum;
						}, 0) || 0;

					depositReceiptPaidAmount =
						receiptItem.transactionReceipt?.reduce((sum, { month: transactionMonth, year: transactionYear, amount = 0 }) => {
							if (!transactionMonth || !transactionYear) return sum;
							if (transactionYear === year && transactionMonth === month) {
								return sum + amount;
							}
							return sum;
						}, 0) || 0;

					console.log('log of depositReceiptPaidAmount: ', depositReceiptPaidAmount);

					totalIncidentalRevenue += amount - totalOlderAmountDepositReceipt;
				} else {
					totalIncidentalRevenue += amount;
				}

				if (paidAmount === 0 && status === 'unpaid') continue;
				listIncidentalRevenue.push({
					_id,
					receiptContent: receiptItem.receiptType === 'debts' ? receiptItem.receiptContentDetail : receiptItem.receiptContent,
					amount: receiptItem.receiptType === 'deposit' ? depositReceiptPaidAmount : paidAmount,
					receiptType: receiptItem.receiptType ?? 'incidental',
					// receiptContentDetail: ,
				});
			}
		}

		// --- OTHER REVENUE ---//
		const totalOtherRevenue = otherRevenues.reduce((sum, item) => sum + item.amount, 0);

		const calculateTotalRevenue = () => {
			return totalIncidentalRevenue + totalPeriodicRevenue + totalOtherRevenue;
		};

		const calculateActualTotalRevenue = () => {
			let totalPeriodicRevenue;
			let totalIncidentalRevenue;
			if (listPeriodicRevenue.length > 0) {
				totalPeriodicRevenue = listPeriodicRevenue.reduce((sum, item) => {
					return sum + item.amount;
				}, 0);
			} else if (listPeriodicRevenue <= 0) {
				totalPeriodicRevenue = 0;
			}

			if (listIncidentalRevenue.length > 0) {
				totalIncidentalRevenue = listIncidentalRevenue.reduce((sum, item) => {
					return sum + item.amount;
				}, 0);
			} else if (listIncidentalRevenue <= 0) {
				totalIncidentalRevenue = 0;
			}

			return totalPeriodicRevenue + totalIncidentalRevenue + totalOtherRevenue;
		};

		console.log('log of TotalRevenue: ', calculateTotalRevenue());
		console.log('log of ActualTotalRevenue', calculateActualTotalRevenue());

		cb(null, {
			periodicRevenue,
			incidentalRevenue: listIncidentalRevenue,
			totalRevenue: calculateTotalRevenue(),
			actualTotalRevenue: calculateActualTotalRevenue(),
			period: { month: month, year: year },
			otherRevenue: otherRevenues,
			status: status,
		});
	} catch (error) {
		next(error);
	}
};

exports.getExpenditures = async (data, cb, next) => {
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		var month;
		var year;
		var status;

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const { currentMonth, currentYear } = currentPeriod;
		if (!data.month || !data.year) {
			month = currentMonth;
			year = currentYear;
			status = 'unlock';
		} else {
			month = parseInt(data.month);
			year = parseInt(data.year);
			if (month == currentMonth && year == currentYear) {
				status = 'unlock';
			} else status = 'lock';
		}

		const expenditures = await Entity.BuildingsEntity.aggregate([
			{
				$match: {
					_id: buildingObjectId,
				},
			},
			{
				$lookup: {
					from: 'periodicExpenditures',
					localField: '_id',
					foreignField: 'building',
					as: 'periodicExpenditures',
				},
			},
			{
				$lookup: {
					from: 'expenditures',
					let: {
						buildingId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$building', '$$buildingId'],
										},
										{
											$eq: ['$type', 'incidental'],
										},
										{
											$eq: ['$month', month],
										},
										{
											$eq: ['$year', year],
										},
									],
								},
							},
						},
					],
					as: 'incidentalExpenditures',
				},
			},
			{
				$project: {
					periodicExpenditures: 1,
					incidentalExpenditures: 1,
				},
			},
		]);

		const { incidentalExpenditures, periodicExpenditures } = expenditures[0];

		const result = { incidentalExpenditures, periodicExpenditures, period: { month: month, year: year }, status: 'unlock' };

		cb(null, result);
	} catch (error) {
		next(error);
	}
};

exports.getStatistics = async (data, cb, next) => {
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		let month;
		let year;

		if (!data.month && !data.year) {
			const currentPeriod = await getCurrentPeriod(buildingObjectId);
			month = currentPeriod.currentMonth;
			year = currentPeriod.currentYear;
		} else {
			month = Number(data.month);
			year = Number(data.year);
		}

		const statistics = await Entity.BuildingsEntity.aggregate([
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
					as: 'listRooms',
				},
			},
			{
				$lookup: {
					from: 'customers',
					localField: 'listRooms._id',
					foreignField: 'room',
					as: 'listCustomers',
				},
			},
			{
				$lookup: {
					from: 'vehicles',
					localField: 'listRooms._id',
					foreignField: 'room',
					as: 'listVehicles',
				},
			},
			{
				$lookup: {
					from: 'invoices',
					let: {
						roomIds: {
							$map: {
								input: '$listRooms',
								as: 'r',
								in: '$$r._id',
							},
						},
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$in: ['$room', '$$roomIds'],
										},
										{
											$eq: ['$year', year],
										},
										{
											$eq: ['$month', month],
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
						invoiceId: '$invoiceInfo._id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$in: ['$invoice', '$$invoiceId'],
										},
										{
											$ne: ['$invoice', null],
										},
									],
								},
							},
						},
					],
					as: 'transactionInvoice',
				},
			},
			{
				$lookup: {
					from: 'receipts',
					let: {
						roomIds: {
							$map: {
								input: '$listRooms',
								as: 'r',
								in: '$$r._id',
							},
						},
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$in: ['$room', '$$roomIds'],
										},
										{
											$eq: ['$year', year],
										},
										{
											$eq: ['$month', month],
										},
									],
								},
							},
						},
					],
					as: 'receiptInfo',
				},
			},
			{
				$lookup: {
					from: 'transactions',
					let: {
						receiptIds: {
							$map: {
								input: '$receiptInfo',
								as: 'receipt',
								in: '$$receipt._id',
							},
						},
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$receipt', '$$receiptIds'],
								},
							},
						},
					],
					as: 'transactionReceipt',
				},
			},
			{
				$lookup: {
					from: 'incidentalRevenues',
					let: {
						buildingId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$building', '$$buildingId'],
										},
										{
											$eq: ['$month', month],
										},
										{
											$eq: ['$year', year],
										},
									],
								},
							},
						},
					],
					as: 'incidentalRevenues',
				},
			},
			{
				$lookup: {
					from: 'periodicExpenditures',
					localField: '_id',
					foreignField: 'building',
					as: 'periodicExpenditures',
				},
			},
			{
				$lookup: {
					from: 'expenditures',
					let: {
						buildingId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$building', '$$buildingId'],
										},
										{
											$eq: ['$month', month],
										},
										{
											$eq: ['$year', year],
										},
									],
								},
							},
						},
					],
					as: 'incidentalExpenditures',
				},
			},
			{
				$lookup: {
					from: 'statistics',
					let: {
						buildingId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$building', '$$buildingId'],
										},
										{
											$eq: ['$year', year],
										},
									],
								},
							},
						},
						{
							$project: {
								_id: 1,
								month: 1,
								year: 1,
								profit: 1,
							},
						},
					],
					as: 'recentStatistics',
				},
			},
			{
				$lookup: {
					from: 'statistics',
					let: {
						buildingId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$building', '$$buildingId'],
										},
										{
											$eq: ['$month', month === 1 ? 12 : month - 1],
										},
										{
											$eq: ['$year', month === 1 ? year - 1 : year],
										},
									],
								},
							},
						},
						{
							$project: {
								_id: 1,
								month: 1,
								year: 1,
								profit: 1,
								roomOccupancyRate: '$room.occupancyRate',
								totalVehicle: '$vehicle.totalVehicleCount',
								totalCustomer: '$customer.totalCustomerCount',
							},
						},
					],
					as: 'preStatistics',
				},
			},
			{
				$addFields: {
					totalInvoice: {
						$sum: {
							$map: {
								input: '$transactionInvoice',
								as: 'invoice',
								in: '$$invoice.amount',
							},
						},
					},
					totalReceipt: {
						$sum: {
							$map: {
								input: '$transactionReceipt',
								as: 'receipt',
								in: '$$receipt.amount',
							},
						},
					},
					totalIncidentalRevenue: {
						$sum: {
							$map: {
								input: '$incidentalRevenues',
								as: 'incidentalRevenue',
								in: '$$incidentalRevenue.amount',
							},
						},
					},
					totalPeriodicExpenditure: {
						$sum: {
							$map: {
								input: '$periodicExpenditures',
								as: 'periodicEx',
								in: '$$periodicEx.amount',
							},
						},
					},
					totalIncidentalExpenditure: {
						$sum: {
							$map: {
								input: '$incidentalExpenditures',
								as: 'incidentalEx',
								in: '$$incidentalEx.amount',
							},
						},
					},
					totalRoom: {
						$size: '$listRooms',
					},
					totalRoomStateHired: {
						$size: {
							$filter: {
								input: '$listRooms',
								as: 'room',
								cond: {
									$eq: ['$$room.roomState', 1], // 1 = hired
								},
							},
						},
					},
					totalRoomStateUnHired: {
						$size: {
							$filter: {
								input: '$listRooms',
								as: 'room',
								cond: {
									$or: [
										{
											$eq: ['$$room.roomState', 0],
										},
										{
											$eq: ['$$room.roomState', 2],
										},
									],
								},
							},
						},
					},
					totalCustomer: {
						$size: '$listCustomers',
					},
					customerTemporaryResidence: {
						$size: {
							$filter: {
								input: '$listCustomers',
								as: 'customer',
								cond: {
									$eq: ['$$customer.temporaryResidence', true],
								},
							},
						},
					},
					totalVehicle: {
						$size: '$listVehicles',
					},
					preStatistics: {
						$arrayElemAt: ['$preStatistics', 0],
					},
				},
			},
			{
				$project: {
					_id: 1,
					totalRevenue: {
						$add: ['$totalInvoice', '$totalReceipt', '$totalIncidentalRevenue'],
					},
					totalExpenditure: {
						$add: ['$totalPeriodicExpenditure', '$totalIncidentalExpenditure'],
					},
					profit: {
						$subtract: [
							{
								$add: ['$totalInvoice', '$totalReceipt', '$totalIncidentalRevenue'],
							},
							{
								$add: ['$totalPeriodicExpenditure', '$totalIncidentalExpenditure'],
							},
						],
					},
					profitComparisonRate: {
						$round: [
							{
								$multiply: [
									{
										$divide: [
											{
												$subtract: [
													{
														$subtract: [
															{
																$add: ['$totalInvoice', '$totalReceipt'],
															},
															{
																$add: ['$totalPeriodicExpenditure', '$totalIncidentalExpenditure'],
															},
														],
													},
													'$preStatistics.profit',
												],
											},
											'$preStatistics.profit',
										],
									},
									100,
								],
							},
						],
					},
					room: {
						totalRoom: '$totalRoom',
						totalRoomHired: '$totalRoomStateHired',
						totalRoomUnHired: '$totalRoomStateUnHired',
						roomOccupancyRate: {
							$round: [
								{
									$multiply: [
										{
											$divide: ['$totalRoomStateHired', '$totalRoom'],
										},
										100,
									],
								},
							],
						},
						occupancyComparisonRate: {
							$subtract: [
								{
									$round: [
										{
											$multiply: [
												{
													$divide: ['$totalRoomStateHired', '$totalRoom'],
												},
												100,
											],
										},
									],
								},
								'$preStatistics.roomOccupancyRate',
							],
						},
					},
					customer: {
						totalCustomer: '$totalCustomer',
						customerComparisonRate: {
							$round: [
								{
									$multiply: [
										{
											$divide: [
												{
													$subtract: ['$totalCustomer', '$preStatistics.totalCustomer'],
												},
												'$preStatistics.totalCustomer',
											],
										},
										100,
									],
								},
							],
						},
						customerTemporaryResidence: '$customerTemporaryResidence',
					},
					vehicle: {
						totalVehicle: '$totalVehicle',
						vehicleComparisonRate: {
							$round: [
								{
									$multiply: [
										{
											$divide: [
												{
													$subtract: ['$totalVehicle', '$preStatistics.totalVehicle'],
												},
												'$preStatistics.totalVehicle',
											],
										},
										100,
									],
								},
							],
						},
					},
					recentStatistics: 1,
				},
			},
		]);

		if (statistics.length == 0) {
			throw new Error(`Không có dữ liệu thống kê cho kỳ ${data.month}, ${data.year}`);
		}

		cb(null, { statistics: statistics[0], period: { month, year } });
	} catch (error) {
		next(error);
	}
};
