const { processInvoiceAllocation } = require('../../revenues.util');

describe('processInvoiceAllocation', () => {
	it('allocates paidAmount fully to fees in order', () => {
		const invoice = {
			paidAmount: 300,
		};

		const fees = [
			{ feeName: 'Rent', amount: 200, unit: 'room', feeKey: 'RENT01PH' },
			{ feeName: 'Electric', amount: 100, unit: 'kwh', feeKey: 'ELEC01PH' },
		];

		const result = processInvoiceAllocation(invoice, fees);

		expect(result.totalAmount).toBe(300);
		expect(result.periodicRevenue).toEqual([
			{ feeName: 'Rent', amount: 200, unit: 'room', feeKey: 'RENT01PH' },
			{ feeName: 'Electric', amount: 100, unit: 'kwh', feeKey: 'ELEC01PH' },
		]);
	});

	it('allocates partially when paidAmount is insufficient', () => {
		const invoice = {
			paidAmount: 150,
		};

		const fees = [
			{ feeName: 'Rent', amount: 200, unit: 'room', feeKey: 'RENT01PH' },
			{ feeName: 'Electric', amount: 100, unit: 'kwh', feeKey: 'ELEC01PH' },
		];

		const result = processInvoiceAllocation(invoice, fees);

		expect(result.totalAmount).toBe(150);
		expect(result.periodicRevenue).toEqual([{ feeName: 'Rent', amount: 150, unit: 'room', feeKey: 'RENT01PH' }]);
	});

	it('allocates remaining amount to debts after fees', () => {
		const invoice = {
			paidAmount: 300,
			debts: [{ amount: 200 }],
		};

		const fees = [{ feeName: 'Rent', amount: 200, unit: 'room', feeKey: 'RENT01PH' }];

		const result = processInvoiceAllocation(invoice, fees);

		expect(result.totalAmount).toBe(300);
		expect(result.periodicRevenue).toEqual([
			{ feeName: 'Rent', amount: 200, unit: 'room', feeKey: 'RENT01PH' },
			{ feeName: 'nợ', amount: 100, unit: 'room', feeKey: 'SPEC101PH' },
		]);
	});

	it('returns zero debt entry when no fees and no debts', () => {
		const invoice = {
			paidAmount: 0,
		};

		const result = processInvoiceAllocation(invoice, []);

		expect(result.totalAmount).toBe(0);
		expect(result.periodicRevenue).toEqual([{ feeName: 'nợ', amount: 0, unit: 'room', feeKey: 'SPEC101PH' }]);
	});
});
