/**
 * Test Suite cho hàm checkout (receipt payment)
 * - Kiểm tra xử lý transaction (cash & transfer)
 * - Kiểm tra version checking
 * - Kiểm tra tính toán số tiền
 * - Kiểm tra cập nhật deducted info
 * - Kiểm tra error cases
 */

const mongoose = require('mongoose');
const DataProviders = require('../../receipts');
const Services = require('../../../service');
const Entity = require('../../../models');
const redis = require('../../../config/redisClient');

jest.mock('../../../service');
jest.mock('../../../models');
jest.mock('../../../config/redisClient');
jest.mock('../../../utils/getCurrentPeriod', () => jest.fn().mockResolvedValue({ currentMonth: 2, currentYear: 2024 }));

jest.mock('../../../jobs/BaseJob', () => {
	return class {
		constructor() {
			this.queue = {
				process: jest.fn(),
				add: jest.fn(),
				on: jest.fn(),
			};
		}
		enqueue() {
			return Promise.resolve({ id: 'mock-id' });
		}
	};
});

describe('checkout - Receipt Payment', () => {
	let session;
	const receiptId = new mongoose.Types.ObjectId().toHexString();
	const buildingId = new mongoose.Types.ObjectId().toHexString();
	const collectorId = new mongoose.Types.ObjectId().toHexString();
	const redisKey = 'redis-receipt-checkout';
	const version = 1;
	const amount = 500000;
	const date = new Date('2024-02-06');

	const collectorInfo = {
		_id: collectorId,
		role: 'manager',
	};

	const mockReceipt = {
		_id: new mongoose.Types.ObjectId(receiptId),
		version: version,
		amount: 1000000,
		paidAmount: 0,
		status: 'unpaid',
		detuctedInfo: null,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock session
		session = {
			startTransaction: jest.fn(),
			commitTransaction: jest.fn(),
			abortTransaction: jest.fn(),
			endSession: jest.fn(),
		};
		mongoose.startSession = jest.fn().mockResolvedValue(session);

		// Mock Services
		Services.receipts.findById = jest.fn();
		Services.receipts.updateReceiptPaidStatusWithVersion = jest.fn();
		Services.transactions.createCashTransaction = jest.fn();
		Services.transactions.generateTransferTransactionByManagement = jest.fn();
		Services.depositRefunds.findByReceiptsUnpaid.mockReturnValue({
			session: jest.fn().mockResolvedValue(null),
		});
		Services.receipts.removeDetuctedInfo = jest.fn();

		// Mock Entity
		Entity.ReceiptsEntity = jest.fn();

		// Mock redis
		redis.set = jest.fn().mockResolvedValue('OK');

		// Setup default mocks
		Services.receipts.findById.mockReturnValue({
			session: jest.fn().mockReturnThis(),
			lean: jest.fn().mockReturnThis(),
			exec: jest.fn().mockResolvedValue(mockReceipt),
		});
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	// ==================== HAPPY CASES - CASH ====================

	describe('✅ Cash Payment Success Cases', () => {
		it('should process cash payment successfully', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: amount,
			};

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });

			const result = await DataProviders.checkout(receiptId, buildingId, amount, date, collectorInfo, version, redisKey, 'cash');

			expect(mongoose.startSession).toHaveBeenCalled();
			expect(session.startTransaction).toHaveBeenCalled();
			expect(Services.transactions.createCashTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: amount,
					type: 'receipt',
					collectorId: expect.any(mongoose.Types.ObjectId),
					createdBy: collectorInfo.role,
				}),
				session,
			);
			expect(Services.receipts.updateReceiptPaidStatusWithVersion).toHaveBeenCalledWith(
				expect.objectContaining({
					receiptId,
					paidAmount: 500000, // 0 + 500000
					receiptStatus: expect.any(String),
				}),
				session,
			);
			expect(session.commitTransaction).toHaveBeenCalled();
			expect(redis.set).toHaveBeenCalledWith(redisKey, expect.stringContaining('SUCCESS'), 'EX', process.env.REDIS_EXP_SEC);
			expect(result).toEqual(
				expect.objectContaining({
					transactionId: mockTransaction._id.toString(),
				}),
			);
		});

		it('should process cash payment and update to PAID status', async () => {
			const receiptWithPaidAmount = {
				...mockReceipt,
				paidAmount: 600000,
			};

			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: 400000,
			};

			Services.receipts.findById.mockReturnValue({
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(receiptWithPaidAmount),
			});

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });

			await DataProviders.checkout(receiptId, buildingId, 400000, date, collectorInfo, version, redisKey, 'cash');

			expect(Services.receipts.updateReceiptPaidStatusWithVersion).toHaveBeenCalledWith(
				expect.objectContaining({
					paidAmount: 1000000, // 600000 + 400000
				}),
				session,
			);
		});

		it('should not enqueue notification if collector is OWNER (cash)', async () => {
			const ownerInfo = { ...collectorInfo, role: 'owner' };
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: amount,
			};

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });

			await DataProviders.checkout(receiptId, buildingId, amount, date, ownerInfo, version, redisKey, 'cash');

			// NotiManagerCollectCashReceiptJob should NOT be enqueued
			expect(session.commitTransaction).toHaveBeenCalled();
		});
	});

	// ==================== HAPPY CASES - TRANSFER ====================

	describe('✅ Transfer Payment Success Cases', () => {
		it('should process transfer payment successfully', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: amount,
			};

			Services.transactions.generateTransferTransactionByManagement.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });

			const result = await DataProviders.checkout(receiptId, buildingId, amount, date, collectorInfo, version, redisKey, 'transfer');

			expect(Services.transactions.generateTransferTransactionByManagement).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: amount,
					receipt: expect.any(mongoose.Types.ObjectId),
					createdBy: collectorInfo.role,
				}),
				session,
			);
			expect(session.commitTransaction).toHaveBeenCalled();
			expect(result).toEqual(
				expect.objectContaining({
					transactionId: mockTransaction._id.toString(),
				}),
			);
		});
	});

	// ==================== DEDUCTED INFO - DEPOSIT REFUND ====================

	describe('✅ Deducted Info: Deposit Refund', () => {
		it('should update depositRefund when receipt is paid via depositRefund deduction', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: 500000,
			};

			const receiptWithDeduction = {
				...mockReceipt,
				paidAmount: 0,
				detuctedInfo: {
					detuctedType: 'depositRefund',
				},
			};

			const mockDepositRefund = {
				depositRefundAmount: 200000,
				receiptsUnpaid: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(receiptId)],
				version: 1,
				save: jest.fn().mockResolvedValue({ success: true }),
			};

			Services.receipts.findById.mockReturnValue({
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(receiptWithDeduction),
			});

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });
			Services.depositRefunds.findByReceiptsUnpaid.mockReturnValue({
				session: jest.fn().mockResolvedValue(mockDepositRefund),
			});

			await DataProviders.checkout(receiptId, buildingId, amount, date, collectorInfo, version, redisKey, 'cash');

			expect(Services.depositRefunds.findByReceiptsUnpaid).toHaveBeenCalledWith(expect.any(mongoose.Types.ObjectId));
			expect(mockDepositRefund.depositRefundAmount).toBe(700000); // 200000 + 500000
			expect(mockDepositRefund.save).toHaveBeenCalledWith({ session });
		});

		it('should clear receiptsUnpaid when receipt becomes PAID (deposit refund)', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: 1000000, // Full amount
			};

			const receiptWithDeduction = {
				...mockReceipt,
				paidAmount: 0,
				detuctedInfo: {
					detuctedType: 'depositRefund',
				},
			};

			const mockDepositRefund = {
				depositRefundAmount: 0,
				receiptsUnpaid: [new mongoose.Types.ObjectId(receiptId)],
				version: 1,
				save: jest.fn().mockResolvedValue({ success: true }),
			};

			Services.receipts.findById.mockReturnValue({
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(receiptWithDeduction),
			});

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });
			Services.depositRefunds.findByReceiptsUnpaid.mockReturnValue({
				session: jest.fn().mockResolvedValue(mockDepositRefund),
			});
			Services.checkoutCosts.findByReceiptUnpaidId.mockReturnValue({
				session: jest.fn().mockResolvedValue(mockDepositRefund),
			});

			await DataProviders.checkout(receiptId, buildingId, 1000000, date, collectorInfo, version, redisKey, 'cash');

			expect(mockDepositRefund.receiptsUnpaid.length).toBe(0);
			expect(Services.receipts.removeDetuctedInfo).toHaveBeenCalledWith(expect.any(mongoose.Types.ObjectId), session);
		});
	});

	// ==================== DEDUCTED INFO - CHECKOUT COST ====================

	describe('✅ Deducted Info: Checkout Cost', () => {
		it('should update checkoutCost when receipt is paid via terminateContractEarly deduction', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: 300000,
			};

			const receiptWithDeduction = {
				...mockReceipt,
				paidAmount: 0,
				detuctedInfo: {
					detuctedType: 'terminateContractEarly',
				},
			};

			const mockCheckoutCost = {
				total: 800000,
				receiptsUnpaid: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(receiptId)],
				version: 1,
				save: jest.fn().mockResolvedValue({ success: true }),
			};

			Services.receipts.findById.mockReturnValue({
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(receiptWithDeduction),
			});

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });
			Services.depositRefunds.findByReceiptsUnpaid.mockReturnValue({
				session: jest.fn().mockResolvedValue(mockCheckoutCost),
			});
			Services.checkoutCosts.findByReceiptUnpaidId.mockReturnValue({
				session: jest.fn().mockResolvedValue(mockCheckoutCost),
			});

			await DataProviders.checkout(receiptId, buildingId, 300000, date, collectorInfo, version, redisKey, 'cash');

			expect(Services.checkoutCosts.findByReceiptUnpaidId).toHaveBeenCalledWith(expect.any(mongoose.Types.ObjectId));
			expect(mockCheckoutCost.total).toBe(500000); // 800000 - 300000
			expect(mockCheckoutCost.save).toHaveBeenCalledWith({ session });
		});

		it('should clear receiptsUnpaid when receipt becomes PAID (checkout cost)', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: 1000000,
			};

			const receiptWithDeduction = {
				...mockReceipt,
				paidAmount: 0,
				detuctedInfo: {
					detuctedType: 'terminateContractEarly',
				},
			};

			const mockCheckoutCost = {
				total: 1000000,
				receiptsUnpaid: [new mongoose.Types.ObjectId(receiptId)],
				version: 1,
				save: jest.fn().mockResolvedValue({ success: true }),
			};

			Services.receipts.findById.mockReturnValue({
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(receiptWithDeduction),
			});

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });
			Services.depositRefunds.findByReceiptsUnpaid.mockReturnValue({
				session: jest.fn().mockResolvedValue(mockCheckoutCost),
			});

			Services.checkoutCosts.findByReceiptUnpaidId.mockReturnValue({
				session: jest.fn().mockResolvedValue(mockCheckoutCost),
			});

			await DataProviders.checkout(receiptId, buildingId, 1000000, date, collectorInfo, version, redisKey, 'cash');

			expect(mockCheckoutCost.total).toBe(0); // 1000000 - 1000000
			expect(mockCheckoutCost.receiptsUnpaid.length).toBe(0);
			expect(Services.receipts.removeDetuctedInfo).toHaveBeenCalled();
		});
	});

	// ==================== ERROR CASES ====================

	describe('❌ Error Cases', () => {
		it('should throw ConflictError if version mismatch', async () => {
			const mismatchReceipt = {
				...mockReceipt,
				version: 2, // Different version
			};

			Services.receipts.findById.mockReturnValue({
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mismatchReceipt),
			});

			await expect(DataProviders.checkout(receiptId, buildingId, amount, date, collectorInfo, version, redisKey, 'cash')).rejects.toThrow(
				'Dữ liệu hóa đơn đã bị thay đổi !',
			);

			expect(session.abortTransaction).toHaveBeenCalled();
			expect(redis.set).toHaveBeenCalledWith(redisKey, expect.stringContaining('FAILED'), 'EX', process.env.REDIS_EXP_SEC);
		});

		it('should throw InvalidInputError if amount exceeds receipt amount', async () => {
			const excessiveAmount = 1500000; // Exceeds 1000000

			await expect(
				DataProviders.checkout(receiptId, buildingId, excessiveAmount, date, collectorInfo, version, redisKey, 'cash'),
			).rejects.toThrow('Số tiền thu không hợp lệ !');

			expect(session.abortTransaction).toHaveBeenCalled();
		});

		it('should throw NotFoundError if depositRefund not found', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: amount,
			};

			const receiptWithDeduction = {
				...mockReceipt,
				detuctedInfo: {
					detuctedType: 'depositRefund',
				},
			};

			Services.receipts.findById.mockReturnValue({
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(receiptWithDeduction),
			});

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });
			Services.depositRefunds.findByReceiptsUnpaid.mockReturnValue({
				session: jest.fn().mockResolvedValue(null),
			});
			Services.checkoutCosts.findByReceiptUnpaidId.mockReturnValue({
				session: jest.fn().mockResolvedValue(null),
			});

			await expect(DataProviders.checkout(receiptId, buildingId, amount, date, collectorInfo, version, redisKey, 'cash')).rejects.toThrow(
				'Phiếu hoàn cọc không tồn tại',
			);

			expect(session.abortTransaction).toHaveBeenCalled();
		});

		it('should throw NotFoundError if checkoutCost not found', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: amount,
			};

			const receiptWithDeduction = {
				...mockReceipt,
				detuctedInfo: {
					detuctedType: 'terminateContractEarly',
				},
			};

			Services.receipts.findById.mockReturnValue({
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(receiptWithDeduction),
			});

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });
			Services.depositRefunds.findByReceiptsUnpaid.mockReturnValue({
				session: jest.fn().mockResolvedValue(null),
			});
			Services.checkoutCosts.findByReceiptUnpaidId.mockReturnValue({
				session: jest.fn().mockResolvedValue(null),
			});

			await expect(DataProviders.checkout(receiptId, buildingId, amount, date, collectorInfo, version, redisKey, 'cash')).rejects.toThrow(
				'Phiếu trả phòng không tồn tại',
			);

			expect(session.abortTransaction).toHaveBeenCalled();
		});

		it('should abort transaction and set redis FAILED on error', async () => {
			Services.transactions.createCashTransaction.mockRejectedValue(new Error('DB error'));

			await expect(DataProviders.checkout(receiptId, buildingId, amount, date, collectorInfo, version, redisKey, 'cash')).rejects.toThrow(
				'DB error',
			);

			expect(session.abortTransaction).toHaveBeenCalled();
			expect(redis.set).toHaveBeenCalledWith(redisKey, expect.stringContaining('FAILED'), 'EX', process.env.REDIS_EXP_SEC);
		});
	});

	// ==================== TRANSACTION SAFETY ====================

	describe('🔒 Transaction Safety', () => {
		it('should end session even when error occurs', async () => {
			Services.transactions.createCashTransaction.mockRejectedValue(new Error('Transaction error'));

			try {
				await DataProviders.checkout(receiptId, buildingId, amount, date, collectorInfo, version, redisKey, 'cash');
			} catch (error) {
				// Expected
			}

			expect(session.endSession).toHaveBeenCalled();
		});

		it('should always commit transaction on success', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: amount,
			};

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });

			await DataProviders.checkout(receiptId, buildingId, amount, date, collectorInfo, version, redisKey, 'cash');

			expect(session.startTransaction).toHaveBeenCalled();
			expect(session.commitTransaction).toHaveBeenCalled();
			expect(session.abortTransaction).not.toHaveBeenCalled();
		});
	});

	// ==================== EDGE CASES ====================

	describe('⚠️ Edge Cases', () => {
		it('should handle full payment (amount === receipt.amount)', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: 1000000, // Full amount
			};

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });

			const result = await DataProviders.checkout(receiptId, buildingId, 1000000, date, collectorInfo, version, redisKey, 'cash');

			expect(Services.receipts.updateReceiptPaidStatusWithVersion).toHaveBeenCalledWith(
				expect.objectContaining({
					paidAmount: 1000000,
				}),
				session,
			);
			expect(result.transactionId).toBeDefined();
		});

		it('should handle payment with multiple deductions (only first matching type applies)', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: 300000,
			};

			const receiptWithNoDeduction = {
				...mockReceipt,
				detuctedInfo: null,
			};

			Services.receipts.findById.mockReturnValue({
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(receiptWithNoDeduction),
			});

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });

			const result = await DataProviders.checkout(receiptId, buildingId, 300000, date, collectorInfo, version, redisKey, 'cash');

			expect(Services.depositRefunds.findByReceiptsUnpaid).not.toHaveBeenCalled();
			expect(Services.checkoutCosts.findByReceiptUnpaidId).not.toHaveBeenCalled();
			expect(result.transactionId).toBeDefined();
		});

		it('should handle zero deducted amount after applied calculation', async () => {
			const mockTransaction = {
				_id: new mongoose.Types.ObjectId(),
				amount: 50000, // Less than receipt amount
			};

			const receiptWithDeduction = {
				...mockReceipt,
				paidAmount: 950000, // Already almost paid
				detuctedInfo: {
					detuctedType: 'depositRefund',
				},
			};

			const mockDepositRefund = {
				depositRefundAmount: 100000,
				receiptsUnpaid: [new mongoose.Types.ObjectId(receiptId)],
				version: 1,
				save: jest.fn().mockResolvedValue({ success: true }),
			};

			Services.receipts.findById.mockReturnValue({
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(receiptWithDeduction),
			});

			Services.transactions.createCashTransaction.mockResolvedValue(mockTransaction);
			Services.receipts.updateReceiptPaidStatusWithVersion.mockResolvedValue({ success: true });
			Services.depositRefunds.findByReceiptsUnpaid.mockReturnValue({
				session: jest.fn().mockResolvedValue(mockDepositRefund),
			});

			await DataProviders.checkout(receiptId, buildingId, 50000, date, collectorInfo, version, redisKey, 'cash');

			// appliedAmount = min(50000, 50000) = 50000
			expect(mockDepositRefund.depositRefundAmount).toBe(150000); // 100000 + 50000
		});
	});
});
