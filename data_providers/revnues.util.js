const { unitPriority } = require('../constants/fees');
const { receiptTypes } = require('../constants/receipt');

function getDepositPaidInCurrentPeriod(transactionReceipt, month, year) {
	if (!Array.isArray(transactionReceipt)) return 0;

	return transactionReceipt.reduce((sum, t) => {
		if (t.month === month && t.year === year) {
			return sum + (t.amount || 0);
		}
		return sum;
	}, 0);
}

function getDepositRevenueThisPeriod(receipt) {
	const { amount = 0, carriedOverPaidAmount = 0 } = receipt;
	console.log('log of getDepositRevenueThisPeriod: ', amount, '--', carriedOverPaidAmount, '--', receipt.receiptContent);
	return Math.max(amount - carriedOverPaidAmount, 0);
}

function sortFeesByPriority(fees) {
	return [...fees].sort((a, b) => {
		const priorityA = unitPriority[a.unit] || Infinity;
		const priorityB = unitPriority[b.unit] || Infinity;

		if (priorityA !== priorityB) {
			return priorityA - priorityB;
		}
		return b.amount - a.amount;
	});
}

function processInvoiceAllocation(invoice, fees) {
	const periodicRevenue = [];
	let remaining = invoice.paidAmount || 0;
	let totalAllocated = 0;

	// Process fees first (higher priority)
	const sortedFees = sortFeesByPriority(fees);

	for (const fee of sortedFees) {
		if (remaining <= 0) break;

		const allocated = Math.min(remaining, fee.amount);

		periodicRevenue.push({
			feeName: fee.feeName,
			amount: allocated,
			unit: fee.unit,
			feeKey: fee.feeKey,
		});

		totalAllocated += allocated;
		remaining -= allocated;
	}

	// Process debts (lower priority - only if remaining amount exists)
	if (invoice.debts && Array.isArray(invoice.debts) && invoice.debts.length > 0) {
		for (const debt of invoice.debts) {
			if (remaining <= 0) break;

			const allocated = Math.min(remaining, debt.amount);

			periodicRevenue.push({
				feeName: 'nợ',
				amount: allocated,
				unit: 'room',
				feeKey: 'SPEC101PH',
			});

			totalAllocated += allocated;
			remaining -= allocated;
		}
	}

	// If no fees were paid, explicitly add zero entry
	if (periodicRevenue.length === 0 && (!invoice.debts || invoice.debts.length === 0)) {
		periodicRevenue.push({
			feeName: 'nợ',
			amount: 0,
			unit: 'room',
			feeKey: 'SPEC101PH',
		});
	}

	return { periodicRevenue, totalAmount: totalAllocated };
}

function aggregateRevenueByFeeKey(revenueList) {
	// First grouping by full feeKey
	const groupedByFull = revenueList.reduce((acc, curr) => {
		const key = curr.feeKey || 'SPEC100PH';

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

	// Second grouping by trimmed key
	const groupedByTrimmed = {};

	for (const fee of Object.values(groupedByFull)) {
		const trimmedKey = fee.feeKey.slice(0, -2);

		if (!groupedByTrimmed[trimmedKey]) {
			groupedByTrimmed[trimmedKey] = {
				feeName: fee.feeName,
				amount: 0,
				unit: fee.unit,
				feeKey: trimmedKey,
			};
		}

		groupedByTrimmed[trimmedKey].amount += fee.amount;
	}

	return Object.values(groupedByTrimmed);
}

function processIncidentalRevenues(revenues, month, year) {
	const incidentalRevenue = [];
	let total = 0;

	for (const room of revenues) {
		if (!Array.isArray(room.receiptInfo)) continue;

		for (const receipt of room.receiptInfo) {
			// Skip empty or invalid receipts
			if (!receipt.receiptContent) continue;

			const { _id, amount = 0, paidAmount = 0, status, receiptType, transactionReceipt = [], carriedOverPaidAmount = 0 } = receipt;

			let revenueToPush = null;
			let revenueAmount = 0;

			// Handle DEPOSIT type specially
			if (receiptType === receiptTypes.DEPOSIT) {
				const depositPaidInPeriod = getDepositPaidInCurrentPeriod(transactionReceipt, month, year);

				// Only include if there's payment in current period
				if (depositPaidInPeriod > 0) {
					const depositRevenue = getDepositRevenueThisPeriod(receipt);
					revenueToPush = {
						_id,
						receiptType: receiptTypes.DEPOSIT,
						receiptContent: receipt.receiptContent,
						amount: depositPaidInPeriod,
					};
					revenueAmount = depositRevenue;
				}
			} else {
				// For non-deposit types: only include if paid or partial
				if (paidAmount > 0) {
					revenueToPush = {
						_id,
						receiptType: receiptType ?? receiptTypes.INCIDENTAL,
						receiptContent: receiptType === receiptTypes.DEBTS ? receipt?.receiptContentDetail : receipt?.receiptContent,
						amount: paidAmount,
					};
					revenueAmount = paidAmount;
				}
			}

			// Add to list and total
			if (revenueToPush) {
				incidentalRevenue.push(revenueToPush);
				total += revenueAmount;
			}
		}
	}

	return { incidentalRevenue, total };
}

function calculateRequiredTotal(periodicRevenueList, incidentalTotal, otherTotal) {
	const periodicTotal = Array.isArray(periodicRevenueList) ? periodicRevenueList.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;

	return periodicTotal + incidentalTotal + otherTotal;
}

function calculateActualTotal(periodicRevenueList, incidentalRevenueList, otherTotal) {
	const periodicTotal = Array.isArray(periodicRevenueList) ? periodicRevenueList.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;

	const incidentalTotal = Array.isArray(incidentalRevenueList) ? incidentalRevenueList.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;

	return periodicTotal + incidentalTotal + otherTotal;
}

module.exports = {
	getDepositPaidInCurrentPeriod,
	getDepositRevenueThisPeriod,
	aggregateRevenueByFeeKey,
	processIncidentalRevenues,
	calculateRequiredTotal,
	calculateActualTotal,
	processInvoiceAllocation,
};
