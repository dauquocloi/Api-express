const { calculateFeeIndexAmount, calculateFeeUnitQuantityAmount } = require('../utils/calculateFeeTotal');
const { invoiceStatus } = require('../constants/invoices');

const generateInvoiceFees = (listFeeOfRoom, rentAmount, stayDays, feeIndexValues, shouldGetFull, mode = 'create') => {
	const formatListFees = listFeeOfRoom.map((fee) => {
		switch (fee.unit) {
			case 'index':
				return {
					feeAmount: Number(fee.feeAmount),
					feeName: fee.feeName,
					unit: fee.unit,
					feeKey: fee.feeKey,
					lastIndex: Number(feeIndexValues[fee._id]?.secondIndex ?? 0),
					firstIndex: Number(feeIndexValues[fee._id]?.firstIndex ?? 0),
					amount: calculateFeeIndexAmount(
						fee.feeAmount,
						Number(feeIndexValues[fee._id]?.secondIndex ?? 0),
						Number(feeIndexValues[fee._id]?.firstIndex ?? 0),
					),
				};
			case 'person':
			case 'vehicle':
				let quantity;
				if (mode === 'create') fee.unit === 'vehicle' ? fee.vehicleInfo?.length : fee.customerInfo?.length;
				else quantity = fee.quantity;

				return {
					feeAmount: Number(fee.feeAmount),
					feeName: fee.feeName,
					unit: fee.unit,
					quantity: quantity,
					feeKey: fee.feeKey,
					amount: calculateFeeUnitQuantityAmount(fee.feeAmount, fee.quantity, stayDays),
				};
			case 'room':
				return {
					feeAmount: Number(fee.feeAmount),
					feeName: fee.feeName,
					unit: fee.unit,
					quantity: Number(fee.quantity),
					feeKey: fee.feeKey,
					amount: calculateFeeUnitQuantityAmount(fee.feeAmount, 1, stayDays),
				};
			default:
				return null;
		}
	});

	if (shouldGetFull) {
		formatListFees.unshift({
			feeAmount: Number(rentAmount),
			feeName: 'Tiền phòng',
			unit: 'room',
			quantity: 1,
			feeKey: 'SPEC100PH',
			amount: calculateFeeUnitQuantityAmount(rentAmount, 1, stayDays),
		});
	}

	return formatListFees;
};

const calculateInvoiceUnpaidAmount = (paidAmount, amount) => {
	return Math.max(amount - paidAmount, 0);
};

const getInvoiceStatus = (paidAmount, amount) => {
	if (paidAmount === 0) return invoiceStatus['UNPAID'];
	if (paidAmount >= amount) return invoiceStatus['PAID'];
	return invoiceStatus['PARTIAL'];
};

module.exports = { generateInvoiceFees, calculateInvoiceUnpaidAmount, getInvoiceStatus };
