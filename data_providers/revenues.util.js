const { unitPriority } = require('../constants/fees');
const { receiptTypes } = require('../constants/receipt');
const { depositStatus, feeUnit } = require('../constants');

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
				unit: feeUnit['ROOM'],
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
			unit: feeUnit['ROOM'],
			feeKey: 'SPEC101PH',
		});
	}

	return { periodicRevenue, totalAmount: totalAllocated };
}

function aggregateRevenueByFeeKey(revenueList) {
	if (!Array.isArray(revenueList) || !revenueList.length) return [];
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

function calculateActualTotal(periodicRevenueList, incidentalRevenueList, otherTotal) {
	const periodicTotal = Array.isArray(periodicRevenueList) ? periodicRevenueList.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;

	const incidentalTotal = Array.isArray(incidentalRevenueList) ? incidentalRevenueList.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;

	return periodicTotal + incidentalTotal + otherTotal;
}

function allocateInvoiceFees(invoice, fees) {
	const result = [];
	let remaining = invoice.paidAmount || 0;
	const hasDeducted = invoice.detuctedInfo?.detuctedId;
	const sortedFees = sortFeesByPriority(fees);

	// ===== 1. PROCESS FEES =====
	for (const fee of sortedFees) {
		if (remaining <= 0 && hasDeducted) break;

		const requiredAmount = hasDeducted ? Math.min(remaining, fee.amount) : fee.amount;

		const actualPaid = Math.min(remaining, fee.amount);

		result.push({
			feeName: fee.feeName,
			amount: requiredAmount,
			actualPaidAmount: actualPaid,
			unit: fee.unit,
			feeKey: fee.feeKey,
		});

		remaining -= actualPaid;
	}

	// ===== 2. PROCESS DEBTS =====
	if (invoice.debts?.length > 0) {
		for (const debt of invoice.debts) {
			if (remaining <= 0 && hasDeducted) break;

			const requiredAmount = hasDeducted ? Math.min(remaining, debt.amount) : debt.amount;

			const actualPaid = Math.min(remaining, debt.amount);

			result.push({
				feeName: 'nợ',
				amount: requiredAmount,
				actualPaidAmount: actualPaid,
				unit: feeUnit['ROOM'],
				feeKey: 'SPEC101PH',
			});

			remaining -= actualPaid;
		}
	}

	// ===== 3. FALLBACK ZERO =====
	if (result.length === 0) {
		result.push({
			feeName: 'nợ',
			amount: 0,
			actualPaidAmount: 0,
			unit: feeUnit['ROOM'],
			feeKey: 'SPEC101PH',
		});
	}

	return result;
}

function aggregateFeesByKey(feeList) {
	// First grouping by full feeKey
	const groupedByFull = feeList.reduce((acc, curr) => {
		const key = curr.feeKey || 'SPEC100PH';

		if (!acc[key]) {
			acc[key] = {
				feeName: curr.feeName,
				amount: 0,
				actualPaidAmount: 0,
				unit: curr.unit,
				feeKey: key,
			};
		}

		acc[key].amount += curr.amount;
		acc[key].actualPaidAmount += curr.actualPaidAmount;
		return acc;
	}, {});

	// Second grouping by trimmed key
	const groupedByTrimmed = {};

	for (const fee of Object.values(groupedByFull)) {
		const trimmedKey = fee.feeKey.slice(0, -2);

		if (!groupedByTrimmed[trimmedKey]) {
			groupedByTrimmed[trimmedKey] = {
				feeName: fee.feeName,
				totalFeeAmount: 0,
				totalActualFeePaidAmount: 0,
				unit: fee.unit,
				feeKey: trimmedKey,
			};
		}

		groupedByTrimmed[trimmedKey].totalFeeAmount += fee.amount;
		groupedByTrimmed[trimmedKey].totalActualFeePaidAmount += fee.actualPaidAmount;
	}

	return Object.values(groupedByTrimmed);
}

function processInvoicesReceipts(revenues, month, year) {
	const periodicRevenueList = [];
	const incidentalRevenue = [];

	let totalPeriodicRequired = 0;
	let totalIncidental = 0;

	for (const room of revenues) {
		// ============================================
		// PROCESS PERIODIC REVENUES - INVOICES
		// ============================================
		if (Array.isArray(room.invoiceInfo) && room.invoiceInfo.length > 0) {
			for (const invoice of room.invoiceInfo) {
				// Skip invalid invoices
				if (!invoice || Object.keys(invoice).length === 0) continue;

				// Skip if no fees
				if (!Array.isArray(invoice.fee) || invoice.fee.length === 0) {
					continue;
				}

				// Allocate paid amount to fees and debts
				const { periodicRevenue } = processInvoiceAllocation(invoice, invoice.fee);

				periodicRevenueList.push(...periodicRevenue);

				// Add to total based on invoice total
				// Use paidAmount if deducted, otherwise use total
				const amountToCount = !invoice.deductedInfo || !invoice.deductedInfo.deductedId ? invoice.total || 0 : invoice.paidAmount || 0;

				totalPeriodicRequired += amountToCount;
			}
		}

		// ============================================
		// PROCESS INCIDENTAL REVENUES - RECEIPTS
		// ============================================
		if (Array.isArray(room.receiptInfo)) {
			for (const receipt of room.receiptInfo) {
				// Skip empty or invalid receipts
				if (!receipt.receiptContent) continue;

				const { _id, amount = 0, paidAmount = 0, receiptType } = receipt;

				let revenueToPush = null;
				let revenueAmount = 0;

				// Handle DEPOSIT type specially
				if (receiptType === receiptTypes.DEPOSIT) {
					const transactionReceipt = receipt.transactions || [];

					const depositPaidInPeriod = getDepositPaidInCurrentPeriod(transactionReceipt, month, year);

					if (receipt.depositStatus === depositStatus['CANCELLED']) {
						revenueAmount = paidAmount;
					} else {
						revenueAmount = getDepositRevenueThisPeriod(receipt);
					}

					// Only include if there's payment in current period
					if (depositPaidInPeriod > 0) {
						revenueToPush = {
							_id,
							receiptType: receiptTypes.DEPOSIT,
							receiptContent: receipt.receiptContent,
							amount: depositPaidInPeriod,
						};
					}
				} else {
					// For non-deposit types:
					// only include if paid or partial
					if (paidAmount > 0) {
						revenueToPush = {
							_id,
							receiptType: receiptType ?? receiptTypes.INCIDENTAL,
							receiptContent: receiptType === receiptTypes.DEBTS ? receipt.receiptContentDetail : receipt.receiptContent,
							amount: paidAmount,
						};
					}

					revenueAmount = amount;
				}

				// Add to list
				if (revenueToPush) {
					incidentalRevenue.push(revenueToPush);
				}

				totalIncidental += revenueAmount;
			}
		}
	}

	return {
		periodicRevenueList,
		totalPeriodicRequired,
		incidentalRevenue,
		totalIncidental,
	};
}

module.exports = {
	getDepositPaidInCurrentPeriod,
	getDepositRevenueThisPeriod,
	aggregateRevenueByFeeKey,
	calculateActualTotal,
	processInvoiceAllocation,
	aggregateFeesByKey,
	allocateInvoiceFees,
	processInvoicesReceipts,
};
