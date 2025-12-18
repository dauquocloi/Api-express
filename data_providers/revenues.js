const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const formatFee = require('../utils/formatFee');
const { NotFoundError } = require('../AppError');
const Pipelines = require('../service/aggregates');

// Un Refactored
exports.getRevenues = async (data) => {
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
	revenueInfo = await Entity.BuildingsEntity.aggregate(Pipelines.revenues.getAllRevenues(buildingObjectId, month, year, status));
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

	return {
		periodicRevenue,
		incidentalRevenue: listIncidentalRevenue,
		totalRevenue: calculateTotalRevenue(),
		actualTotalRevenue: calculateActualTotalRevenue(),
		period: { month: month, year: year },
		otherRevenue: otherRevenues,
		status: status,
	};
};

exports.createIncidentalRevenue = async (amount, content, collector, buildingId) => {
	const buildingObjectId = mongoose.Types.ObjectId(buildingId);

	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const newIncidentalRevenue = await Entity.IncidentalRevenuesEntity.create({
		building: buildingObjectId,
		month: currentPeriod?.currentMonth,
		year: currentPeriod?.currentYear,
		amount: amount,
		content: content,
		collector: collector,
	});

	return newIncidentalRevenue;
};

exports.modifyIncidentalRevenue = async (data) => {
	const incidentalRevenue = await Entity.IncidentalRevenuesEntity.findOne({ _id: data.revenueId });
	if (incidentalRevenue == null) {
		throw new NotFoundError('Dữ liệu không tồn tại');
	}
	Object.assign(incidentalRevenue, data);
	await incidentalRevenue.save();

	return incidentalRevenue;
};

exports.deleteIncidentalRevenue = async (data) => {
	const incidentalRevenueObjectId = mongoose.Types.ObjectId(data.incidentalRevenueId);

	const incidentalRevenue = await Entity.IncidentalRevenuesEntity.deleteOne({ _id: incidentalRevenueObjectId });

	if (incidentalRevenue.deletedCount === 0) {
		throw new NotFoundError('Dữ liệu không tồn tại');
	}

	return incidentalRevenue;
};

// Un refacted
exports.getTotalFeeRevenue = async (data) => {
	const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

	var month;
	var year;
	var status;
	var feeName;

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

	const feeRevenue = await Entity.BuildingsEntity.aggregate(Pipelines.revenues.getFeeRevenueDetail(buildingObjectId, month, year));
	if (feeRevenue.length === 0) {
		throw new NotFoundError(`Phí với key ${data.feeKey} không tồn tại`);
	}

	const { feeRevenueInfo } = feeRevenue[0];
	console.log('log of feeRevenueInfo: ', feeRevenueInfo);

	// kiểm tra tính tồn tại của feeKey gửi về:
	const checkExistedRoom = feeRevenueInfo.some((roomItem) =>
		roomItem.invoice.fee.some((feeItem) => {
			const trimmedFeeKey = feeItem.feeKey?.slice(0, -2);
			if (trimmedFeeKey === data.feeKey) {
				feeName = feeItem.feeName;
				return true;
			}
			return false;
		}),
	);

	if (!checkExistedRoom) throw new NotFoundError(`Phí ${data.feeKey} không tồn tại!`);

	var totalFeeAmount = 0;
	var totalActualCurrentFeePaidAmount = 0;
	for (const roomItem of feeRevenueInfo) {
		const { invoice, transaction } = roomItem;
		const listFeeFormated = formatFee(invoice.fee);
		const totalTransaction = transaction.reduce((sum, item) => sum + item.amount, 0);
		var remaining = totalTransaction;

		for (const feeItem of listFeeFormated) {
			const actualPaid = Math.min(remaining, feeItem.amount);
			const actualFeePaidAmount = remaining === 0 ? 0 : actualPaid;

			if (feeItem.feeKey === data.feeKey) {
				totalFeeAmount += feeItem.amount;
				totalActualCurrentFeePaidAmount += actualFeePaidAmount;
			}
			remaining -= actualPaid;
		}
	}

	const listRoomUnPaid =
		status === 'lock'
			? []
			: feeRevenueInfo
					.map((roomItem) => {
						const { invoice } = roomItem;
						if (invoice.status === 'unpaid' || invoice.status === 'partial') {
							return {
								invoiceId: invoice._id,
								roomIndex: roomItem.roomIndex,
								total: invoice.total,
								status: invoice.status,
							};
						} else return null;
					})
					.filter(Boolean);

	return {
		feeDetail: { totalFeeAmount: totalFeeAmount, totalActualFeePaidAmount: totalActualCurrentFeePaidAmount, feeName: feeName },
		listRoomUnPaid: listRoomUnPaid,
		period: {
			month,
			year,
		},
		status: status,
	};
};
