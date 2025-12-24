const { calculateFeeIndexAmount, calculateFeeUnitQuantityAmount } = require('../utils/calculateFeeTotal');
const { invoiceStatus } = require('../constants/invoices');
const { feeUnit } = require('../constants/fees');

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

const getInvoiceStatus = (paidAmount, amount) => {
	if (paidAmount === 0) return invoiceStatus['UNPAID'];
	if (paidAmount >= amount) return invoiceStatus['PAID'];
	return invoiceStatus['PARTIAL'];
};

const generateInvoiceFeesFromReq = (fees, rent, stayDays) => {
	const formatListFees = fees.map((fee) => {
		if (fee.unit === feeUnit['INDEX']) {
			return {
				feeAmount: Number(fee.feeAmount),
				feeName: fee.feeName,
				unit: fee.unit,
				feeKey: fee.feeKey,
				lastIndex: Number(fee.secondIndex) ?? 0,
				firstIndex: Number(fee.firstIndex) ?? 0,
				amount: calculateFeeIndexAmount(fee.feeAmount, Number(fee.secondIndex ?? 0), Number(fee.firstIndex ?? 0)),
			};
		}
		if (fee.unit === feeUnit['VEHICLE'] || fee.unit === feeUnit['PERSON']) {
			return {
				feeAmount: Number(fee.feeAmount),
				feeName: fee.feeName,
				unit: fee.unit,
				quantity: fee.quantity,
				feeKey: fee.feeKey,
				amount: calculateFeeUnitQuantityAmount(fee.feeAmount, fee.quantity, stayDays),
			};
		}
		if (fee.unit === feeUnit['ROOM']) {
			return {
				feeAmount: Number(fee.feeAmount),
				feeName: fee.feeName,
				unit: fee.unit,
				quantity: 1,
				feeKey: fee.feeKey,
				amount: calculateFeeUnitQuantityAmount(fee.feeAmount, 1, stayDays),
			};
		}
	});
	formatListFees.unshift({
		feeAmount: Number(rent),
		feeName: 'Tiền phòng',
		unit: 'room',
		quantity: 1,
		feeKey: 'SPEC100PH',
		amount: calculateFeeUnitQuantityAmount(rent, 1, stayDays),
	});
	return formatListFees;
};

module.exports = { generateInvoiceFees, getInvoiceStatus, generateInvoiceFeesFromReq };
