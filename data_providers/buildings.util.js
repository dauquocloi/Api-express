const { debtStatus } = require('../constants/debts');
const { receiptTypes: RECEIPT_TYPES, receiptStatus } = require('../constants/receipt');
const { invoiceStatus } = require('../constants/invoices');
const { calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { OWNER_CONFIRMED_STATUS } = require('../constants/transactions');
const { feeUnit } = require('../constants/fees');
const { Schema, FormatType } = require('../constants/excel');
const { roomState, roomStateTransform } = require('../constants/rooms');

const isMissingInvoice = (rooms, invoices) =>
	rooms.filter((room) => room.roomState !== 0).some((room) => !invoices.some((invoice) => invoice.room.toString() === room._id.toString()));

const formatPeriodicExpenditurePayload = (periodicExpenditures, currentMonth, currentYear, buildingId, userId) => {
	if (!periodicExpenditures.length || periodicExpenditures.length === 0) return [];
	return periodicExpenditures.map((exp) => ({
		amount: exp.amount,
		content: exp.content,
		month: currentMonth,
		year: currentYear,
		type: 'periodic',
		// date: exp.createdAt,
		building: buildingId,
		spender: userId,
		locked: false,
	}));
};

const handleReceiptSettlement = (receipts) => {
	const receiptUpdatingIds = [];
	const receiptCarriedOverPaidAmountMap = new Map();

	for (const receipt of receipts) {
		const { paidAmount, locked, receiptType } = receipt;
		if (locked === true || receiptType === RECEIPT_TYPES['CHECKOUT']) continue;
		if (receiptType === RECEIPT_TYPES['DEPOSIT']) {
			receiptCarriedOverPaidAmountMap.set(receipt._id, paidAmount);
			continue;
		}

		receiptUpdatingIds.push(receipt._id);
	}

	return { receiptUpdatingIds, receiptCarriedOverPaidAmountMap };
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
			rent: room.roomState === roomState['UN_HIRED'] ? room.roomPrice : room.contract.rent,
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

		// 👉 tổng thu (nếu cần)
		const totalInvoice = (room.invoices ?? []).reduce((sum, i) => sum + (i.total ?? 0), 0);
		const totalReceipt = (room.receipts ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0);

		row.totalIncome = totalInvoice + totalReceipt;

		return row;
	});
};

const styleExcel = (worksheet, schema) => {
	// 👉 column style
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

	// 👉 header style
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

	// 👉 border + giữ alignment
	worksheet.eachRow((row, rowNumber) => {
		row.eachCell((cell) => {
			// border
			cell.border = {
				top: { style: 'thin' },
				left: { style: 'thin' },
				bottom: { style: 'thin' },
				right: { style: 'thin' },
			};

			// 👉 merge thay vì overwrite
			cell.alignment = {
				...cell.alignment,
				vertical: 'middle',
			};
		});
	});
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
};
