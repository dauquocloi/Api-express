const { calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { calculateComparisonRate } = require('../utils/calculateComparisonRate');
const {
	Schema,
	FormatType,
	roomState,
	roomStateTransform,
	checkoutCostStatus,
	depositRefundStats,
	invoiceStatus,
	receiptStatus,
	receiptTypes: RECEIPT_TYPES,
	debtStatus,
	OWNER_CONFIRMED_STATUS,
	feeUnit,
	expenditureType,
} = require('../constants');
const { getExpenditures } = require('./expenditures');
const { getRevenues } = require('./revenues');
const Services = require('../service');
const { InternalError } = require('../AppError');

const getMissingInvoiceCount = (rooms, invoices) =>
	rooms
		.filter((room) => room.roomState !== roomState['UN_HIRED'])
		.filter((room) => !invoices.some((invoice) => invoice.room.toString() === room._id.toString())).length;

const isMissingInvoice = (rooms, invoices) => getMissingInvoiceCount(rooms, invoices) > 0;

const formatPeriodicExpenditurePayload = (periodicExpenditures, currentMonth, currentYear, buildingId, userId) => {
	if (!periodicExpenditures.length || periodicExpenditures.length === 0) return [];
	return periodicExpenditures.map((exp) => ({
		amount: exp.amount,
		content: exp.content,
		month: currentMonth,
		year: currentYear,
		type: expenditureType['PERIODIC'],
		// date: exp.createdAt,
		building: buildingId,
		spender: userId,
		locked: false,
	}));
};

const handleReceiptSettlement = (receipts) => {
	const receiptUpdatingIds = [];
	const depositReceiptCarriedOverPaidAmountMap = new Map();

	for (const receipt of receipts) {
		const { paidAmount, locked, receiptType } = receipt;
		if (locked === true || receiptType === RECEIPT_TYPES['CHECKOUT']) continue;
		if (receiptType === RECEIPT_TYPES['DEPOSIT']) {
			depositReceiptCarriedOverPaidAmountMap.set(receipt._id, paidAmount);
			continue;
		}

		receiptUpdatingIds.push(receipt._id);
	}

	return { receiptUpdatingIds, depositReceiptCarriedOverPaidAmountMap };
};

const generateDebtFromReceipts = (receipts, currentMonth, currentYear) => {
	const debts = [];

	for (const receipt of receipts) {
		const { amount, paidAmount, status, locked, receiptType, receiptContent } = receipt;

		if (locked === true || receiptType === RECEIPT_TYPES['CHECKOUT'] || receiptType === RECEIPT_TYPES['DEPOSIT']) continue;

		if (status === receiptStatus['UNPAID'] || status === receiptStatus['PARTIAL']) {
			debts.push({
				content: receiptContent,
				amount: calculateInvoiceUnpaidAmount(amount, paidAmount),
				period: { month: currentMonth, year: currentYear },
				status: debtStatus.PENDING,
				room: receipt.room,
				contract: receipt.contract,
			});
		}
	}

	return debts;
};

const generateDebtFromInvoices = (invoices, currentMonth, currentYear) => {
	const debts = [];
	const invoiceUpdatingIds = [];

	for (const invoice of invoices) {
		const { total, paidAmount, status, locked } = invoice;

		if (locked === true) continue;

		if (status === invoiceStatus['UNPAID'] || status === invoiceStatus['PARTIAL']) {
			debts.push({
				content: invoice.invoiceContent,
				amount: calculateInvoiceUnpaidAmount(total, paidAmount),
				period: { month: currentMonth, year: currentYear },
				status: debtStatus.PENDING,
				room: invoice.room,
				contract: invoice.contract,
			});
		}

		invoiceUpdatingIds.push(invoice._id);
	}

	return { debts, invoiceUpdatingIds };
};

const existTransactionUnConfirmed = (data) => {
	for (const invoice of data.invoices) {
		if (invoice.transactions && invoice.transactions.length > 0) {
			for (const transaction of invoice.transactions) {
				if (transaction.ownerConfirmed === OWNER_CONFIRMED_STATUS['PENDING']) {
					return true;
				}
			}
		}
	}

	// Kiểm tra transactions trong receipts
	for (const receipt of data.receipts) {
		if (receipt.transactions && receipt.transactions.length > 0) {
			for (const transaction of receipt.transactions) {
				if (transaction.ownerConfirmed === OWNER_CONFIRMED_STATUS['PENDING']) {
					return true;
				}
			}
		}
	}

	return false;
};

const formatExcel = (row, schema) => {
	schema.forEach((col) => {
		const cell = row.getCell(col.key);

		if (cell.value === null || cell.value === undefined) return;

		const format = FormatType[col.type];
		if (format) {
			cell.numFmt = format;
		}
	});
};

const generateColumnExcel = (data) => {
	const columnMap = new Map();

	data.rooms.forEach((room) => {
		room.fees.forEach((fee) => {
			if (fee.unit === feeUnit['INDEX']) {
				columnMap.set(`${fee.feeKey}_oldIndex`, {
					header: 'Số cũ',
					key: `${fee.feeKey}_oldIndex`,
					type: 'number',
					width: 15,
				});

				columnMap.set(`${fee.feeKey}_newIndex`, {
					header: 'Số mới',
					key: `${fee.feeKey}_newIndex`,
					type: 'number',
					width: 15,
				});

				columnMap.set(`${fee.feeKey}_feeValue`, {
					header: fee.feeName,
					key: `${fee.feeKey}_feeValue`,
					type: 'number', // or money
					width: 15,
				});
			} else {
				columnMap.set(`${fee.feeKey}_feeValue`, {
					header: fee.feeName,
					key: `${fee.feeKey}_feeValue`,
					type: 'number',
					width: 15,
				});
			}
		});
	});

	const insertAfterKey = 'customerPhone';

	const index = Schema.findIndex((col) => col.key === insertAfterKey);

	const before = Schema.slice(0, index + 1);
	const after = Schema.slice(index + 1);

	// merge lại
	const finalSchema = [...before, ...Array.from(columnMap.values()), ...after];

	return finalSchema;
};

const generateRowExcelData = (data) => {
	return data.rooms.map((room) => {
		const row = {
			room: room.roomIndex,
			depositAmount: room.roomState === roomState['UN_HIRED'] ? 0 : room.contract.depositReceipt.amount,
			depositPaidAmount: room.roomState === roomState['UN_HIRED'] ? 0 : room.contract.depositReceipt.paidAmount,
			rent: room.roomState === roomState['UN_HIRED'] ? room.roomPrice : room.contract?.versions?.[0]?.rent,
			roomState: roomStateTransform[room.roomState],
			numberOfTenants: room.roomState === roomState['UN_HIRED'] ? 0 : room.contract.customerQuantity || 1,
			numberOfVehicles: room.roomState === roomState['UN_HIRED'] ? 0 : room.contract.vehicleQuantity || 0,
			customerName: room.roomState === roomState['UN_HIRED'] ? '' : room.contract.customers.find((c) => c.isContractOwner)?.fullName || '',
			customerPhone: room.roomState === roomState['UN_HIRED'] ? '' : room.contract.customers.find((c) => c.isContractOwner)?.phone || '',
		};

		room.fees.forEach((fee) => {
			if (fee.unit === feeUnit['INDEX']) {
				row[`${fee.feeKey}_oldIndex`] = fee.feeIndexHistory?.prevIndex ?? null;

				row[`${fee.feeKey}_newIndex`] = fee.feeIndexHistory?.lastIndex ?? null;

				row[`${fee.feeKey}_feeValue`] = fee.feeAmount ?? 0;
			} else {
				row[`${fee.feeKey}_feeValue`] = fee.feeAmount ?? 0;
			}
		});

		//  tổng thu (nếu cần)
		const totalInvoice = (room.invoices ?? []).reduce((sum, i) => sum + (i.total ?? 0), 0);
		const totalReceipt = (room.receipts ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0);

		row.totalIncome = totalInvoice + totalReceipt;

		return row;
	});
};

const styleExcel = (worksheet, schema) => {
	//  column style
	schema.forEach((col) => {
		const column = worksheet.getColumn(col.key);

		column.font = {
			name: 'Arial',
			size: 10,
		};

		column.alignment = {
			vertical: 'middle',
			horizontal: col.type === 'number' || col.type === 'money' ? 'right' : 'left',
		};
	});

	//  header style
	const headerRow = worksheet.getRow(1);

	headerRow.height = 35;

	headerRow.eachCell((cell) => {
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FF008000' },
		};

		cell.font = {
			color: { argb: 'FFFFFFFF' },
			bold: true,
			size: 10,
		};

		cell.alignment = {
			horizontal: 'center',
			vertical: 'middle',
			wrapText: true,
		};
	});

	// border + giữ alignment
	worksheet.eachRow((row, rowNumber) => {
		row.eachCell((cell) => {
			// border
			cell.border = {
				top: { style: 'thin' },
				left: { style: 'thin' },
				bottom: { style: 'thin' },
				right: { style: 'thin' },
			};

			//  merge thay vì overwrite
			cell.alignment = {
				...cell.alignment,
				vertical: 'middle',
			};
		});
	});
};

const checkFinnaceSettlementCondition = ({ checkoutCostsUnpaid, depositRefundsUnpaid, pendingTransactions, invoices, rooms }) => {
	if (depositRefundsUnpaid.length) {
		return {
			pass: false,
			reason: 'Tồn tại khoản phí trả cọc chưa được hoàn thành !',
			reasonDetail: 'Tồn tại khoản phí trả cọc chưa được hoàn thành. Bạn cần hoàn thành các khoản trả cọc trước khi thực hiện quyết toán.',
			items: depositRefundsUnpaid.length,
		};
	}
	if (checkoutCostsUnpaid.length) {
		return {
			pass: false,
			reason: 'Tồn tại khoản phí trả phòng chưa được thu !',
			reasonDetail: 'Tồn tại khoản phí trả phòng chưa được thu. Bạn cần hoàn thành các khoản phí này trước khi thực hiện quyết toán.',
			items: checkoutCostsUnpaid.length,
		};
	}
	if (pendingTransactions.length) {
		return {
			pass: false,
			reason: 'Tồn tại giao dịch đang chờ xác nhận được xác nhận !',
			reasonDetail: 'Tồn tại giao dịch đang chờ xác nhận được xác nhận. Bạn cần xác nhận các giao dịch này trước khi thực hiện quyết toán.',
			items: pendingTransactions.length,
		};
	}
	const missingInvoiceCount = getMissingInvoiceCount(rooms, invoices);
	if (missingInvoiceCount > 0) {
		return {
			pass: false,
			reason: 'Tồn tại phòng chưa có hóa đơn tiền nhà !',
			reasonDetail: 'Mọi phòng đều cần được gửi hóa đơn tiền nhà trước khi thực hiện quyết toán.',
			items: missingInvoiceCount,
		};
	}

	return {
		pass: true,
	};
};

const calculateFinalProfit = (totalActualRevenue, totalExpenditure) => totalActualRevenue - totalExpenditure;

const generateStatisticDocument = async ({ buildingId, currentMonth, currentYear }) => {
	const [revenues, expenditures, statisticInfo] = await Promise.all([
		getRevenues({ buildingId, month: currentMonth, year: currentYear }),
		getExpenditures(buildingId, currentMonth, currentYear),

		Services.statistics.getStatisticCurrentPeriod(buildingId, currentMonth, currentYear),
	]);

	const { room, customer, vehicle, preStatistics } = statisticInfo;

	const revenueComparisonRate = calculateComparisonRate(preStatistics.revenue, revenues.actualTotalRevenue);
	const expenditureComparisonRate = calculateComparisonRate(preStatistics.expenditure, expenditures.totalExpenditure);

	const profit = calculateFinalProfit(revenues.actualTotalRevenue, expenditures.totalExpenditure);
	const profitComparisonRate = calculateComparisonRate(preStatistics.profit, profit);

	const generateStatistic = await Services.statistics.createStatistics({
		month: currentMonth === 12 ? 1 : currentMonth + 1,
		year: currentMonth === 12 ? currentYear + 1 : currentYear,
		building: buildingId,
		revenue: revenues.actualTotalRevenue,
		revenueComparisonRate: revenueComparisonRate,
		expenditure: expenditures.totalExpenditure,
		expenditureComparisonRate: expenditureComparisonRate,
		profit: profit,
		profitComparisonRate,
		room: {
			totalRoom: room.totalRoom,
			rentedRoom: room.rentedRoom,
			emptyRoom: room.emptyRoom,
			occupancyRate: room.occupancyRate,
			occupancyComparisonRate: room.occupancyComparisonRate,
		},

		vehicle: { totalVehicle: vehicle.totalVehicle, vehicleComparisonRate: vehicle.vehicleComparisonRate },
		customer: {
			temporaryResidentTotal: customer.temporaryResidentTotal,
			totalCustomer: customer.totalCustomer,
			customerComparisonRate: customer.customerComparisonRate,
		},
		isInitialStatistics: false,
	});

	return generateStatistic;
};

module.exports = {
	isMissingInvoice,
	formatPeriodicExpenditurePayload,
	handleReceiptSettlement,
	generateDebtFromReceipts,
	generateDebtFromInvoices,
	existTransactionUnConfirmed,
	generateColumnExcel,
	generateRowExcelData,
	formatExcel,
	styleExcel,
	checkFinnaceSettlementCondition,
	calculateFinalProfit,
	generateStatisticDocument,
};
