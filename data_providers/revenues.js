const mongoose = require('mongoose');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const formatFee = require('../utils/formatFee');
const { NotFoundError, BadRequestError } = require('../AppError');
const Pipelines = require('../service/aggregates');
const { receiptTypes, receiptStatus } = require('../constants/receipt');
const { unitPriority } = require('../constants/fees');
const {
	processInvoiceAllocation,
	processIncidentalRevenues,
	calculateActualTotal,
	aggregateRevenueByFeeKey,
	allocateInvoiceFees,
	aggregateFeesByKey,
} = require('./revenues.util');
const Services = require('../service');

// Un Refactored !
// exports.getRevenues = async (data) => {
// 	const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);
// 	var revenueInfo;
// 	var month;
// 	var year;
// 	var status;

// 	const currentPeriod = await getCurrentPeriod(buildingObjectId);
// 	const { currentMonth, currentYear } = currentPeriod;
// 	if (!data.month || !data.year) {
// 		month = currentMonth;
// 		year = currentYear;
// 		status = 'unlock';
// 	} else {
// 		month = parseInt(data.month);
// 		year = parseInt(data.year);
// 		if (month == currentMonth && year == currentYear) {
// 			status = 'unlock';
// 		} else status = 'lock';
// 	}
// 	revenueInfo = await Entity.BuildingsEntity.aggregate(Pipelines.revenues.getAllRevenues(buildingObjectId, month, year));
// 	if (!Array.isArray(revenueInfo) || !revenueInfo[0]?._id) {
// 		throw new BadRequestError('Dữ liệu không tồn tại');
// 	}

// 	// const unitPriority = {
// 	// 	room: 1,
// 	// 	vehicle: 2,
// 	// 	person: 3,
// 	// 	index: 4,
// 	// 	other: 5,
// 	// };
// 	const { revenues, otherRevenues } = revenueInfo[0];

// 	// ----PERIODIC REVENUES----//
// 	let totalPeriodicRevenue = 0;
// 	const listPeriodicRevenue = [];
// 	for (const invoiceItem of revenues) {
// 		if (!Array.isArray(invoiceItem.invoiceInfo) || invoiceItem.invoiceInfo.length === 0) {
// 			continue;
// 		}

// 		for (const invoice of invoiceItem.invoiceInfo) {
// 			if (!invoice || Object.keys(invoice).length === 0) {
// 				continue;
// 			}

// 			console.log('log of invoice: ', invoice);
// 			if (invoice.total !== undefined) {
// 				if (!invoice.detuctedInfo || !invoice.detuctedInfo.detuctedId) {
// 					totalPeriodicRevenue += invoice.total;
// 				} else {
// 					totalPeriodicRevenue += invoice.paidAmount;
// 				}
// 			}

// 			let remaining = invoice.paidAmount;

// 			invoice.fee?.sort((a, b) => {
// 				const priorityA = unitPriority[a.unit] || Infinity;
// 				const priorityB = unitPriority[b.unit] || Infinity;

// 				if (priorityA !== priorityB) {
// 					return priorityA - priorityB;
// 				}
// 				return b.amount - a.amount;
// 			});

// 			for (const feeItem of invoice.fee ?? []) {
// 				let cost = feeItem.amount;
// 				const actualPaid = Math.min(remaining, cost);

// 				let paidAmount = 0;

// 				if (remaining === 0) {
// 					paidAmount = 0;
// 				} else if (actualPaid === cost) {
// 					paidAmount = cost;
// 				} else if (actualPaid === remaining) {
// 					paidAmount = remaining;
// 				}

// 				listPeriodicRevenue.push({
// 					feeName: feeItem.feeName,
// 					amount: paidAmount,
// 					unit: feeItem.unit,
// 					feeKey: feeItem.feeKey,
// 				});

// 				remaining -= actualPaid;
// 			}

// 			if (!invoice.debts || invoice.debts.length == 0) {
// 				listPeriodicRevenue.push({
// 					feeName: 'nợ',
// 					amount: 0,
// 					unit: 'room',
// 					feeKey: 'SPEC101PH',
// 				});
// 				continue;
// 			}

// 			for (const debt of invoice.debts) {
// 				let debtAmount = debt.amount;

// 				const actualDebtPaid = Math.min(remaining, debtAmount);

// 				let debtPaidAmount = 0;
// 				if (remaining === 0) {
// 					debtPaidAmount = 0;
// 				} else if (actualDebtPaid == debtAmount) {
// 					debtPaidAmount = debtAmount;
// 				} else if (actualDebtPaid == remaining) {
// 					debtPaidAmount = remaining;
// 				}

// 				listPeriodicRevenue.push({
// 					feeName: 'nợ',
// 					amount: debtPaidAmount,
// 					unit: 'room',
// 					feeKey: 'SPEC101PH',
// 				});

// 				remaining -= actualDebtPaid;
// 			}
// 		}
// 	}

// 	const groupedListPeriodic = listPeriodicRevenue.reduce((acc, curr) => {
// 		const key = curr.feeKey || 'SPEC100PH'; // fallback nếu feeKey không có

// 		if (!acc[key]) {
// 			acc[key] = {
// 				feeName: curr.feeName,
// 				amount: 0,
// 				unit: curr.unit,
// 				feeKey: key,
// 			};
// 		}

// 		acc[key].amount += curr.amount;
// 		return acc;
// 	}, {});

// 	const periodicRevenueMap = new Map();

// 	Object.values(groupedListPeriodic).forEach((fee) => {
// 		const trimmedKey = fee.feeKey.slice(0, -2);

// 		if (periodicRevenueMap.has(trimmedKey)) {
// 			const existing = periodicRevenueMap.get(trimmedKey);
// 			existing.amount += fee.amount;
// 		} else {
// 			periodicRevenueMap.set(trimmedKey, {
// 				feeName: fee.feeName,
// 				amount: fee.amount,
// 				unit: fee.unit,
// 				feeKey: trimmedKey,
// 			});
// 		}
// 	});

// 	const periodicRevenue = Array.from(periodicRevenueMap.values());

// 	// ----INCIDENTAL REVENUE ------//
// 	let totalIncidentalRevenue = 0;
// 	const listIncidentalRevenue = [];

// 	for (const room of revenues) {
// 		for (const receiptItem of room.receiptInfo) {
// 			if (!receiptItem.receiptContent) continue;

// 			const { _id, amount = 0, paidAmount = 0, status, receiptType, transactionReceipt, carriedOverPaidAmount = 0 } = receiptItem;

// 			let depositPaidThisPeriod = 0;
// 			let depositRevenueThisPeriod = 0;

// 			if (receiptType === receiptTypes.DEPOSIT) {
// 				depositPaidThisPeriod = getDepositPaidInCurrentPeriod(transactionReceipt, month, year);

// 				depositRevenueThisPeriod = getDepositRevenueThisPeriod(receiptItem);

// 				totalIncidentalRevenue += depositRevenueThisPeriod;
// 			} else {
// 				totalIncidentalRevenue += amount;
// 			}

// 			// Không có giao dịch + chưa thanh toán → bỏ
// 			if (paidAmount === 0 && status === receiptStatus.UNPAID) continue;

// 			// Nếu là DEPOSIT mà kỳ này không phát sinh giao dịch → không push
// 			if (receiptType === receiptTypes.DEPOSIT && depositPaidThisPeriod === 0) {
// 				continue;
// 			}

// 			listIncidentalRevenue.push({
// 				_id,
// 				receiptType: receiptType ?? receiptTypes.INCIDENTAL,
// 				receiptContent: receiptType === receiptTypes.DEBTS ? receiptItem.receiptContentDetail : receiptItem.receiptContent,
// 				amount: receiptType === receiptTypes.DEPOSIT ? depositPaidThisPeriod : paidAmount,
// 			});
// 		}
// 	}

// 	// --- OTHER REVENUE ---//
// 	const totalOtherRevenue = otherRevenues.reduce((sum, item) => sum + item.amount, 0);

// 	console.log('log of totalIncidental: ', totalIncidentalRevenue);
// 	console.log('log of totalPeriodc: ', totalPeriodicRevenue);
// 	console.log('log of totalOther: ', totalOtherRevenue);
// 	// --- TOTAL REVENUE ---//
// 	const calculateTotalRevenue = () => {
// 		return totalIncidentalRevenue + totalPeriodicRevenue + totalOtherRevenue;
// 	};

// 	const calculateActualTotalRevenue = () => {
// 		let totalPeriodicRevenue;
// 		let totalIncidentalRevenue;
// 		if (listPeriodicRevenue.length > 0) {
// 			totalPeriodicRevenue = listPeriodicRevenue.reduce((sum, item) => {
// 				return sum + item.amount;
// 			}, 0);
// 		} else if (listPeriodicRevenue <= 0) {
// 			totalPeriodicRevenue = 0;
// 		}

// 		if (listIncidentalRevenue.length > 0) {
// 			totalIncidentalRevenue = listIncidentalRevenue.reduce((sum, item) => {
// 				return sum + item.amount;
// 			}, 0);
// 		} else if (listIncidentalRevenue <= 0) {
// 			totalIncidentalRevenue = 0;
// 		}

// 		return totalPeriodicRevenue + totalIncidentalRevenue + totalOtherRevenue;
// 	};

// 	console.log('log of TotalRevenue: ', calculateTotalRevenue());
// 	console.log('log of ActualTotalRevenue', calculateActualTotalRevenue());

// 	return {
// 		periodicRevenue,
// 		incidentalRevenue: listIncidentalRevenue,
// 		totalRevenue: calculateTotalRevenue(),
// 		actualTotalRevenue: calculateActualTotalRevenue(),
// 		period: { month: month, year: year },
// 		otherRevenue: otherRevenues,
// 		status: status,
// 	};
// };

exports.getRevenues = async (data) => {
	const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);

	// Determine period
	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const { currentMonth, currentYear } = currentPeriod;

	const month = data.month ? parseInt(data.month) : currentMonth;
	const year = data.year ? parseInt(data.year) : currentYear;
	const isCurrentPeriod = month === currentMonth && year === currentYear;
	const status = isCurrentPeriod ? 'unlock' : 'lock';

	// Fetch revenue data
	const revenueInfo = await Entity.BuildingsEntity.aggregate(Pipelines.revenues.getAllRevenues(buildingObjectId, month, year));

	// Validate response
	if (!Array.isArray(revenueInfo) || !revenueInfo[0]?._id) {
		throw new BadRequestError('Dữ liệu không tồn tại');
	}

	const { revenues, otherRevenues = [] } = revenueInfo[0];

	// ===== PROCESS PERIODIC REVENUES =====
	const periodicRevenueList = [];
	let totalPeriodicRequired = 0;

	for (const room of revenues) {
		if (!Array.isArray(room.invoiceInfo) || room.invoiceInfo.length === 0) {
			continue;
		}

		for (const invoice of room.invoiceInfo) {
			// Skip invalid invoices
			if (!invoice || Object.keys(invoice).length === 0) continue;

			// Skip if no fees
			if (!Array.isArray(invoice.fee) || invoice.fee.length === 0) continue;

			// Allocate paid amount to fees and debts
			const { periodicRevenue, totalAmount } = processInvoiceAllocation(invoice, invoice.fee);

			periodicRevenueList.push(...periodicRevenue);

			// Add to total based on invoice total (not paidAmount)
			// Use paidAmount if deducted, otherwise use total
			const amountToCount = !invoice.deductedInfo || !invoice.deductedInfo.deductedId ? invoice.total || 0 : invoice.paidAmount || 0;

			totalPeriodicRequired += amountToCount;
		}
	}

	// Aggregate periodic revenues
	const periodicRevenue = aggregateRevenueByFeeKey(periodicRevenueList);

	// ===== PROCESS INCIDENTAL REVENUES =====
	const { incidentalRevenue, total: totalIncidentalRevenue } = processIncidentalRevenues(revenues, month, year);

	// ===== PROCESS OTHER REVENUES =====
	const totalOtherRevenue = Array.isArray(otherRevenues) ? otherRevenues.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;

	// ===== CALCULATE TOTALS =====
	// totalRevenue: sum of all invoice totals (required to collect)
	const totalRevenue = totalPeriodicRequired + totalIncidentalRevenue + totalOtherRevenue;

	// actualTotalRevenue: sum of actual paid amounts
	const actualTotalRevenue = calculateActualTotal(periodicRevenue, incidentalRevenue, totalOtherRevenue);

	console.log('DEBUG - Periodic Revenue List:', periodicRevenueList);
	console.log('DEBUG - Total Periodic Required:', totalPeriodicRequired);
	console.log('DEBUG - Incidental Total Actual:', totalIncidentalRevenue);
	console.log('DEBUG - Other Revenue Total:', totalOtherRevenue);
	console.log('DEBUG - Total Revenue (Required):', totalRevenue);
	console.log('DEBUG - Actual Total Revenue (Paid):', actualTotalRevenue);

	return {
		periodicRevenue,
		incidentalRevenue,
		otherRevenue: otherRevenues,
		period: { month, year },
		status,
		totalRevenue, // Theoretical/Required revenue
		actualTotalRevenue, // Actual/Paid revenue
		totals: {
			periodicRequired: totalPeriodicRequired,
			periodicActual: calculateActualTotal(periodicRevenue, [], 0),
			incidentalActual: totalIncidentalRevenue,
			otherActual: totalOtherRevenue,
		},
	};
};

exports.getTotalFeeRevenue = async (buildingId, month, year, feeKey) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	let status = 'lock';

	const { currentMonth, currentYear } = currentPeriod;
	if (!month || !year) {
		month = currentMonth;
		year = currentYear;
		status = 'unlock';
	} else {
		month = parseInt(month);
		year = parseInt(year);
		if (month == currentMonth && year == currentYear) {
			status = 'unlock';
		}
	}
	const invoiceData = await Services.buildings.getAllInvoicesInPeriod(buildingObjectId, month, year);

	let listFeeRevenue = [];
	for (const invoice of invoiceData) {
		// Skip invalid invoices
		if (!invoice || Object.keys(invoice).length === 0) continue;

		// Skip if no fees
		if (!Array.isArray(invoice.fee) || invoice.fee.length === 0) continue;

		// Allocate paid amount to fees and debts
		const fees = allocateInvoiceFees(invoice, invoice.fee);
		listFeeRevenue.push(...fees);

		console.log('DEBUG - fees:', fees);
	}
	const grouptedFees = aggregateFeesByKey(listFeeRevenue);

	console.log('DEBUG - grouptedFees:', grouptedFees);
	const feeRevenue = grouptedFees.find((fee) => fee.feeKey === feeKey);
	console.log('DEBUG - feeRevenue:', feeRevenue);
	if (!feeRevenue) throw new BadRequestError('Không tìm thấy mã phí trong kỳ');

	return { feeRevenue, status: status, period: { month: month, year: year } };
};
