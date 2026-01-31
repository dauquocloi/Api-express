const { debtStatus } = require('../constants/debts');
const { receiptTypes: RECEIPT_TYPES, receiptStatus } = require('../constants/receipt');
const { invoiceStatus } = require('../constants/invoices');
const { calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { OWNER_CONFIRMED_STATUS } = require('../constants/transactions');

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
		date: exp.createdAt,
		building: buildingId,
		spender: userId,
		locked: false,
	}));
};

// const handleReceiptDepositSettlement = () => {
//     let receiptDepositUpdatingPayload = new Map();

// }

const handleReceiptSettlement = (receipts) => {
	const receiptUpdatingIds = [];
	const receiptCarriedOverPaidAmountMap = new Map();

	for (const receipt of receipts) {
		const { paidAmount, locked, receiptType } = receipt;

		if (locked === true || receiptType === RECEIPT_TYPES['CHECKOUT']) continue;

		if (receiptType === RECEIPT_TYPES['DEPOSIT']) {
			receiptCarriedOverPaidAmountMap.set(receipt._id, paidAmount);
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

module.exports = {
	isMissingInvoice,
	formatPeriodicExpenditurePayload,
	handleReceiptSettlement,
	generateDebtFromReceipts,
	generateDebtFromInvoices,
	existTransactionUnConfirmed,
};
