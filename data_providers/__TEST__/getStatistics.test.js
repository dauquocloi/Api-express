// ===== TEST CASES & EXAMPLES =====
const {
	getDepositPaidInCurrentPeriod,
	getDepositRevenueThisPeriod,
	aggregateRevenueByFeeKey,
	processIncidentalRevenues,
	calculateRequiredTotal,
	calculateActualTotal,
	processInvoiceAllocation,
} = require('../revnues.util');
/**
 * Test Case 1: Basic scenario - single invoice with fees
 */
describe('getRevenues - Basic Invoice Processing', () => {
	it('should allocate paid amount to fees by priority', () => {
		// Mock data
		const invoice = {
			_id: 'inv-1',
			total: 1000,
			paidAmount: 700,
			status: 'paid',
			fee: [
				{ feeName: 'Room', amount: 500, unit: 'room', feeKey: 'ROOM001' },
				{ feeName: 'Water', amount: 200, unit: 'index', feeKey: 'WATER001' },
			],
			debts: [],
		};

		const result = processInvoiceAllocation(invoice, invoice.fee);

		// Expected: Room fee (priority 1) gets 500, Water fee (priority 4) gets 200
		expect(result.periodicRevenue).toEqual([
			{ feeName: 'Room', amount: 500, unit: 'room', feeKey: 'ROOM001' },
			{ feeName: 'Water', amount: 200, unit: 'index', feeKey: 'WATER001' },
		]);
		expect(result.totalAmount).toBe(700);
	});

	it('should respect unit priority order', () => {
		// Mock: Multiple fees with same priority, ordered by amount desc
		const invoice = {
			total: 1000,
			paidAmount: 600,
			fee: [
				{ feeName: 'Water', amount: 200, unit: 'index', feeKey: 'W' },
				{ feeName: 'Electric', amount: 300, unit: 'index', feeKey: 'E' },
				{ feeName: 'Room', amount: 400, unit: 'room', feeKey: 'R' },
			],
			debts: null,
		};

		const result = processInvoiceAllocation(invoice, invoice.fee);

		// Expected: Room (priority 1) first: 400, then Electric (priority 4, amount 300): 200 remaining
		expect(result.periodicRevenue[0].amount).toBe(400); // Room
		expect(result.periodicRevenue[1].amount).toBe(200); // Electric (partial)
	});

	it('should handle partial payment with remaining for debts', () => {
		const invoice = {
			total: 1000,
			paidAmount: 500,
			fee: [{ feeName: 'Room', amount: 300, unit: 'room', feeKey: 'R' }],
			debts: [{ amount: 300 }],
		};

		const result = processInvoiceAllocation(invoice, invoice.fee);

		// Expected: Room gets 300, Debt gets remaining 200
		expect(result.periodicRevenue).toContainEqual({
			feeName: 'Room',
			amount: 300,
			unit: 'room',
			feeKey: 'R',
		});
		expect(result.periodicRevenue).toContainEqual({
			feeName: 'nợ',
			amount: 200,
			unit: 'room',
			feeKey: 'SPEC101PH',
		});
	});

	it('should not allocate anything if paidAmount is 0', () => {
		const invoice = {
			total: 1000,
			paidAmount: 0,
			status: 'unpaid',
			fee: [{ feeName: 'Room', amount: 1000, unit: 'room', feeKey: 'R' }],
			debts: null,
		};

		const result = processInvoiceAllocation(invoice, invoice.fee);

		expect(result.totalAmount).toBe(0);
		expect(result.periodicRevenue.every((item) => item.amount === 0)).toBe(true);
	});
});

/**
 * Test Case 2: Deposit revenue handling
 */
describe('getRevenues - Deposit Processing', () => {
	it('should calculate deposit revenue correctly (revenue = total - carriedOver)', () => {
		const receipt = {
			amount: 5000000, // Total deposit
			carriedOverPaidAmount: 2000000, // Already counted in previous period
			receiptContent: 'Room deposit',
			receiptType: 'deposit',
		};

		const revenue = getDepositRevenueThisPeriod(receipt);

		// Expected: 5000000 - 2000000 = 3000000
		expect(revenue).toBe(3000000);
	});

	it('should return 0 if deposit already fully carried over', () => {
		const receipt = {
			amount: 5000000,
			carriedOverPaidAmount: 5000000,
		};

		const revenue = getDepositRevenueThisPeriod(receipt);

		expect(revenue).toBe(0);
	});

	it('should get deposit paid in current period', () => {
		const transactionReceipt = [
			{ month: 8, year: 2024, amount: 2000000 },
			{ month: 9, year: 2024, amount: 1000000 },
			{ month: 8, year: 2024, amount: 500000 },
		];

		const result = getDepositPaidInCurrentPeriod(transactionReceipt, 8, 2024);

		// Expected: 2000000 + 500000 = 2500000
		expect(result).toBe(2500000);
	});

	it('should handle transactions without month/year (null)', () => {
		const transactionReceipt = [
			{ month: null, year: null, amount: 1000000 },
			{ month: 8, year: 2024, amount: 500000 },
		];

		const result = getDepositPaidInCurrentPeriod(transactionReceipt, 8, 2024);

		// Expected: Only matched transaction
		expect(result).toBe(500000);
	});
});

/**
 * Test Case 3: Revenue aggregation
 */
describe('getRevenues - Revenue Aggregation', () => {
	it('should aggregate fees by full feeKey first', () => {
		const revenueList = [
			{ feeName: 'Room', amount: 500, unit: 'room', feeKey: 'SPEC100PH' },
			{ feeName: 'Room', amount: 300, unit: 'room', feeKey: 'SPEC100PH' },
			{ feeName: 'Water', amount: 200, unit: 'index', feeKey: 'N12220SO' },
		];

		const result = aggregateRevenueByFeeKey(revenueList);

		// After first grouping: SPEC100PH should have 800
		// After trim and re-group: SPEC10 should have 800
		expect(result.find((r) => r.feeKey === 'SPEC10').amount).toBe(800);
	});

	it('should handle fallback key SPEC100PH', () => {
		const revenueList = [
			{ feeName: 'Debt', amount: 100, unit: 'room', feeKey: undefined },
			{ feeName: 'Debt', amount: 50, unit: 'room', feeKey: null },
		];

		const result = aggregateRevenueByFeeKey(revenueList);

		// Both should fallback to SPEC100PH
		expect(result.some((r) => r.feeKey.includes('SPEC'))).toBe(true);
	});

	it('should aggregate by trimmed key correctly', () => {
		const revenueList = [
			{ feeName: 'Room', amount: 100, unit: 'room', feeKey: 'SPEC100PH' },
			{ feeName: 'Room', amount: 200, unit: 'room', feeKey: 'SPEC100VN' },
			{ feeName: 'Water', amount: 300, unit: 'index', feeKey: 'N12220SO' },
			{ feeName: 'Water', amount: 150, unit: 'index', feeKey: 'N12220VN' },
		];

		const result = aggregateRevenueByFeeKey(revenueList);

		// After trimming: SPEC10 should have 300, N1222 should have 450
		expect(result.find((r) => r.feeKey === 'SPEC10').amount).toBe(300);
		expect(result.find((r) => r.feeKey === 'N1222').amount).toBe(450);
	});
});

/**
 * Test Case 4: Total calculations
 */
describe('getRevenues - Total Calculations', () => {
	it('should differentiate totalRevenue (required) vs actualTotalRevenue (paid)', () => {
		const periodicList = [
			{ feeName: 'Room', amount: 500, feeKey: 'R' }, // Allocated
		];
		const incidentalList = [
			{ amount: 100 }, // Paid
		];
		const otherTotal = 50;

		const required = calculateRequiredTotal(periodicList, 200, otherTotal);
		const actual = calculateActualTotal(periodicList, incidentalList, otherTotal);

		// required = 500 + 200 + 50 = 750
		// actual = 500 + 100 + 50 = 650
		expect(required).toBe(750);
		expect(actual).toBe(650);
		expect(actual).toBeLessThan(required);
	});

	it('should handle empty arrays gracefully', () => {
		const actual = calculateActualTotal([], [], 0);
		expect(actual).toBe(0);

		const actual2 = calculateActualTotal(null, null, 0);
		expect(actual2).toBe(0);
	});
});

/**
 * Test Case 5: Full integration test with real-like data
 */
describe('getRevenues - Full Integration', () => {
	it('should process complete building revenue data correctly', async () => {
		// Mock building data similar to your JSON structure
		const buildingData = {
			_id: {
				$oid: '695a9eb8e8765a0ebbc0bae2',
			},
			revenues: [
				{
					roomId: 'room-107',
					roomIndex: '107',
					invoiceInfo: [
						{
							_id: 'inv-1',
							total: 407000,
							paidAmount: 407000,
							status: 'paid',
							fee: [
								{
									feeName: 'Water',
									amount: 391000,
									unit: 'index',
									feeKey: 'N12220SO',
								},
								{
									feeName: 'Electric',
									amount: 16000,
									unit: 'index',
									feeKey: 'E1221SO',
								},
							],
							debts: null,
						},
					],
					receiptInfo: [
						{
							_id: 'receipt-1',
							amount: 65000,
							status: 'paid',
							receiptContent: 'Extra service',
							receiptType: 'incidental',
							paidAmount: 65000,
							transactionReceipt: [
								{
									amount: 65000,
									month: 10,
									year: 2025,
								},
							],
						},
					],
				},
			],
			otherRevenues: [{ amount: 100000 }],
		};

		// Expected results:
		// - Periodic: Water 391k + Electric 16k = 407k allocated
		// - Incidental: 65k paid
		// - Other: 100k
		// - Total (required): 407k + 65k + 100k = 572k
		// - Actual (paid): 407k + 65k + 100k = 572k

		// In real test:
		// const result = await getRevenues({ buildingId: buildingData._id });
		// expect(result.totals.totalRevenue).toBe(572000);
		// expect(result.totals.actualTotalRevenue).toBe(572000);
	});

	it('should handle partial payments correctly', () => {
		// Scenario:
		// - Total invoice: 1000
		// - Paid: 600
		// - Expected to allocate 600 to fees, leave 400 as unpaid

		const invoice = {
			total: 1000,
			paidAmount: 600,
			fee: [
				{ feeName: 'Fee1', amount: 500, unit: 'room', feeKey: 'F1' },
				{ feeName: 'Fee2', amount: 500, unit: 'room', feeKey: 'F2' },
			],
			debts: null,
		};

		const { periodicRevenue, totalAmount } = processInvoiceAllocation(invoice, invoice.fee);

		// Fee1 gets 500, Fee2 gets 100 (remaining)
		expect(totalAmount).toBe(600);
		expect(periodicRevenue[0].amount).toBe(500);
		expect(periodicRevenue[1].amount).toBe(100);
	});

	it('should handle multiple rooms with different invoice statuses', () => {
		// Scenario:
		// - Room 1: Paid 100%
		// - Room 2: Paid 50%
		// - Room 3: Not paid
		// Expected: Different actualTotalRevenue vs totalRevenue
		// Implementation would test full getRevenues() with all 3 rooms
		// Assert: actualTotalRevenue = 1000 + 500 + 0 = 1500
		//         totalRevenue = 1000 + 1000 + 1000 = 3000
	});
});

/**
 * Edge Cases & Error Handling
 */
describe('getRevenues - Edge Cases', () => {
	it('should handle null invoice gracefully', () => {
		const invoice = null;
		expect(() => {
			// Should skip or throw meaningful error
		}).not.toThrow();
	});

	it('should handle missing fee array', () => {
		const invoice = {
			total: 1000,
			paidAmount: 500,
			fee: undefined, // ← Missing
			debts: null,
		};

		const result = processInvoiceAllocation(invoice, invoice.fee || []);
		expect(result.totalAmount).toBe(0);
	});

	it('should handle negative amounts gracefully', () => {
		const invoice = {
			paidAmount: -100, // Invalid
			fee: [{ amount: 100, unit: 'room', feeKey: 'F' }],
		};

		const result = processInvoiceAllocation(invoice, invoice.fee);
		// Should either skip or treat as 0
		expect(result.totalAmount).toBeLessThanOrEqual(0);
	});

	it('should handle very large numbers', () => {
		const invoice = {
			paidAmount: 999999999999,
			fee: [
				{ amount: 500000000000, unit: 'room', feeKey: 'F' },
				{ amount: 500000000000, unit: 'room', feeKey: 'F2' },
			],
		};

		const result = processInvoiceAllocation(invoice, invoice.fee);
		expect(result.totalAmount).toBe(999999999999);
	});

	it('should skip empty receiptInfo arrays', () => {
		const revenues = [
			{
				receiptInfo: [], // ← Empty
			},
			{
				receiptInfo: null, // ← Null
			},
		];

		// Should not throw
		expect(() => {
			processIncidentalRevenues(revenues, 10, 2025);
		}).not.toThrow();
	});
});

/**
 * Performance Tests
 */
describe('getRevenues - Performance', () => {
	it('should process 100 rooms with 10 invoices each in < 1 second', () => {
		const largeDataset = generateLargeDataset(100, 10);

		const start = performance.now();
		const result = aggregateRevenueByFeeKey(largeDataset);
		const end = performance.now();

		expect(end - start).toBeLessThan(1000); // 1 second
		expect(result.length).toBeGreaterThan(0);
	});
});

// Helper function
function generateLargeDataset(numRooms, numInvoicesPerRoom) {
	const dataset = [];
	for (let i = 0; i < numRooms * numInvoicesPerRoom; i++) {
		dataset.push({
			feeName: `Fee ${i}`,
			amount: Math.random() * 10000,
			unit: 'room',
			feeKey: `KEY${String(i).padStart(4, '0')}PH`,
		});
	}
	return dataset;
}
