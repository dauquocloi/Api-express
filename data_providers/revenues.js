const mongoose = require('mongoose');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const formatFee = require('../utils/formatFee');
const { NotFoundError, BadRequestError, NoDataError } = require('../AppError');
const {
	calculateActualTotal,
	aggregateRevenueByFeeKey,
	allocateInvoiceFees,
	aggregateFeesByKey,
	processInvoicesReceipts,
} = require('./revenues.util');
const Services = require('../service');

exports.getRevenues = async (data) => {
	const { month, year, buildingId } = data;
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	// Determine period
	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const { currentMonth, currentYear } = currentPeriod;

	if ((!!month && parseInt(month) !== currentMonth) || (!!year && parseInt(year) !== currentYear)) {
		const checkExistedStatisticInPeriod = await Services.statistics.findByBuildingId(buildingObjectId, month, year).lean().exec();
		if (!checkExistedStatisticInPeriod || checkExistedStatisticInPeriod?.isInitialStatistics === true) return null;
	}

	const queryMonth = !month ? currentMonth : parseInt(month);
	const queryYear = !year ? currentYear : parseInt(year);
	const revenueStatus = queryMonth == currentMonth && queryYear == currentYear ? 'unlock' : 'lock';

	// Fetch revenue data
	const revenueInfo = await Services.buildings.getRevenues(buildingObjectId, queryMonth, queryYear);

	const { revenues, otherRevenues = [] } = revenueInfo;

	// ===== PROCESS INCIDENTAL & PERIODIC REVENUES =====

	const { periodicRevenueList, totalPeriodicRequired, incidentalRevenue, totalIncidental } = processInvoicesReceipts(
		revenues,
		queryMonth,
		queryYear,
	);

	// Aggregate periodic revenues
	const periodicRevenue = aggregateRevenueByFeeKey(periodicRevenueList);

	// ===== PROCESS OTHER REVENUES =====
	const totalOtherRevenue = Array.isArray(otherRevenues) ? otherRevenues.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;

	// ===== CALCULATE TOTALS =====
	// totalRevenue: sum of all invoice totals (required to collect)
	const totalRevenue = totalPeriodicRequired + totalIncidental + totalOtherRevenue;

	// actualTotalRevenue: sum of actual paid amounts
	const actualTotalRevenue = calculateActualTotal(periodicRevenue, incidentalRevenue, totalOtherRevenue);

	// console.log('DEBUG - Periodic Revenue List:', periodicRevenueList);
	console.log('DEBUG - Incidental Revenue List:', incidentalRevenue);
	console.log('DEBUG - Total Periodic Required:', totalPeriodicRequired);
	console.log('DEBUG - Incidental Total Actual:', totalIncidental);
	console.log('DEBUG - Other Revenue Total:', totalOtherRevenue);
	console.log('DEBUG - Total Revenue (Required):', totalRevenue);
	console.log('DEBUG - Actual Total Revenue (Paid):', actualTotalRevenue);

	return {
		periodicRevenue,
		incidentalRevenue,
		otherRevenue: otherRevenues,
		period: { month: queryMonth, year: queryYear },
		status: revenueStatus,
		totalRevenue, // Theoretical/Required revenue
		actualTotalRevenue, // Actual/Paid revenue
		// totals: {
		// 	periodicRequired: totalPeriodicRequired,
		// 	periodicActual: calculateActualTotal(periodicRevenue, [], 0),
		// 	incidentalActual: totalIncidentalRevenue,
		// 	otherActual: totalOtherRevenue,
		// },
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
