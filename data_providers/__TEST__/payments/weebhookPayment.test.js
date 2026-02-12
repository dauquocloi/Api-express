/**
 * Test Suite cho hàm weebhookPayment
 * - Kiểm tra xử lý transaction
 * - Kiểm tra các status (invoice/receipt)
 * - Kiểm tra error cases
 * - Kiểm tra broadcast & notification
 */

const mongoose = require('mongoose');
const DataProviders = require('../../payments');
const Services = require('../../../service');
const Entity = require('../../../models');
const { getTransactionManager } = require('../../../instance');

// Mock NotiPaymentJob hoặc bất cứ Job nào đang gọi enqueue

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
jest.mock('../../../service');
jest.mock('../../../models');
jest.mock('../../../instance');
jest.mock('../../../utils/getCurrentPeriod', () => jest.fn().mockResolvedValue({ currentMonth: 2, currentYear: 2024 }));

describe('weebhookPayment', () => {
	let session;
	let mockTransactionManager;

	const mockSepayData = {
		id: 'sep-001',
		gateway: 'Vietcombank',
		transactionDate: '2024-02-06 10:30:00',
		accountNumber: '0123456789',
		code: 'CODE001',
		content: 'payment-001',
		transferAmount: 1000000,
		referenceCode: 'MBVCB.12345',
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock session
		session = {
			withTransaction: jest.fn(),
			endSession: jest.fn(),
		};
		mongoose.startSession = jest.fn().mockResolvedValue(session);

		// Mock transaction manager
		mockTransactionManager = {
			broadcast: jest.fn(),
		};
		getTransactionManager.mockReturnValue(mockTransactionManager);

		// Mock Services
		Services.transactions.checkExistedTransaction = jest.fn();
		Services.bankAccounts.findBankAccountByAccountNumber = jest.fn();
		Services.invoices.findInvoiceInfoByPaymentContent = jest.fn();
		Services.invoices.updateInvoicePaidStatus = jest.fn();
		Services.transactions.generateTransferTransactionBySepay = jest.fn();
		Services.receipts.findReceiptInfoByPaymentContent = jest.fn();
		Services.receipts.updateReceiptPaidAmount = jest.fn();
		Services.checkoutCosts.updateCheckoutCostPaymentStatusByReceiptId = jest.fn();
		Services.depositRefunds.updateDepositRefundStatusByReceiptId = jest.fn();
		Services.transactions.generateUnDetectedTransaction = jest.fn();

		// ensure getCurrentPeriod() query chain works
		Entity.StatisticsEntity = {
			findOne: jest.fn().mockReturnValue({
				sort: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue({ month: 2, year: 2024, statisticsStatus: 'unLock' }),
			}),
		};
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	// ==================== INVOICE HAPPY CASES ====================

	describe('✅ Invoice Payment Success Cases', () => {
		it('should process invoice payment successfully and broadcast status', async () => {
			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockInvoice = {
				_id: new mongoose.Types.ObjectId(),
				paidAmount: 500000,
				total: 2000000,
				status: 'unpaid',
				buildingId: new mongoose.Types.ObjectId(),
				invoiceContent: 'Hóa đơn tháng 2',
				buildingName: 'Building A',
				management: [
					{ role: 'owner', user: new mongoose.Types.ObjectId() },
					{ role: 'manager', user: new mongoose.Types.ObjectId() },
				],
				room: { roomIndex: '01' },
				paymentInfo: { _id: new mongoose.Types.ObjectId(), accountNumber: mockSepayData.accountNumber },
			};

			// Setup mocks
			Services.transactions.checkExistedTransaction.mockResolvedValue(null);

			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(mockInvoice);
			Services.invoices.updateInvoicePaidStatus.mockResolvedValue({ success: true });
			Services.transactions.generateTransferTransactionBySepay.mockResolvedValue({
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			});

			session.withTransaction.mockImplementation(async (callback) => await callback());

			// Execute
			const result = await DataProviders.weebhookPayment(mockSepayData);

			// Assert
			expect(result).toBe('Success');
			expect(mongoose.startSession).toHaveBeenCalled();
			expect(session.withTransaction).toHaveBeenCalled();
			expect(Services.invoices.updateInvoicePaidStatus).toHaveBeenCalledWith(
				expect.objectContaining({
					invoiceId: mockInvoice._id,
					paidAmount: 1500000, // 500000 + 1000000
				}),
				session,
			);
			expect(mockTransactionManager.broadcast).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'invoice',
					payload: expect.objectContaining({
						status: 'processing',
					}),
				}),
			);
			expect(session.endSession).toHaveBeenCalled();
		});

		it('should handle invoice payment when status becomes PAID after payment', async () => {
			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockInvoice = {
				_id: new mongoose.Types.ObjectId(),
				paidAmount: 1500000,
				total: 2000000,
				status: 'unpaid',
				buildingId: new mongoose.Types.ObjectId(),
				invoiceContent: 'Hóa đơn tháng 2',
				buildingName: 'Building A',
				management: [{ role: 'owner', user: new mongoose.Types.ObjectId() }],
				room: { roomIndex: '01' },
				paymentInfo: { _id: new mongoose.Types.ObjectId() },
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(mockInvoice);
			Services.invoices.updateInvoicePaidStatus.mockResolvedValue({ success: true });
			Services.transactions.generateTransferTransactionBySepay.mockResolvedValue({
				_id: new mongoose.Types.ObjectId(),
			});

			session.withTransaction.mockImplementation(async (callback) => await callback());

			const result = await DataProviders.weebhookPayment(mockSepayData);

			expect(result).toBe('Success');
			// Verify updateInvoicePaidStatus was called with new total paid
			expect(Services.invoices.updateInvoicePaidStatus).toHaveBeenCalledWith(
				expect.objectContaining({
					paidAmount: 2500000, // 1500000 + 1000000
					invoiceStatus: expect.any(String),
				}),
				session,
			);
		});
	});

	// ==================== INVOICE ERROR CASES ====================

	describe('❌ Invoice Error Cases', () => {
		it('should return early if transaction already processed (idempotency)', async () => {
			Services.transactions.checkExistedTransaction.mockResolvedValue({ _id: 'existing-transaction' });

			session.withTransaction.mockImplementation(async (callback) => await callback());

			const result = await DataProviders.weebhookPayment(mockSepayData);

			// Should still return success but not process
			expect(Services.invoices.findInvoiceInfoByPaymentContent).not.toHaveBeenCalled();
			expect(session.endSession).toHaveBeenCalled();
		});

		it('should throw BadRequestError if bank account not found', async () => {
			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(null),
			});

			session.withTransaction.mockImplementation(async (callback) => await callback());

			await expect(DataProviders.weebhookPayment(mockSepayData)).rejects.toThrow(
				'Số tài khoản không khớp với bất kỳ tài khoản nào trong hệ thống !',
			);

			expect(session.endSession).toHaveBeenCalled();
		});

		it('should throw BadRequestError if invoice already paid', async () => {
			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockInvoice = {
				_id: new mongoose.Types.ObjectId(),
				paidAmount: 2000000,
				total: 2000000,
				status: 'paid', // Already paid
				buildingId: new mongoose.Types.ObjectId(),
				paymentInfo: { _id: new mongoose.Types.ObjectId() },
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(mockInvoice);

			session.withTransaction.mockImplementation(async (callback) => await callback());

			await expect(DataProviders.weebhookPayment(mockSepayData)).rejects.toThrow('Hóa đơn đã được thanh toán !');

			expect(session.endSession).toHaveBeenCalled();
		});

		it('should return early if invoice no paymentInfo but not throw', async () => {
			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockInvoice = {
				_id: new mongoose.Types.ObjectId(),
				status: 'unpaid',
				paymentInfo: null, // No payment info
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(mockInvoice);

			session.withTransaction.mockImplementation(async (callback) => await callback());

			const result = await DataProviders.weebhookPayment(mockSepayData);

			expect(result).toBe('Success');
			expect(Services.invoices.updateInvoicePaidStatus).not.toHaveBeenCalled();
		});
	});

	// ==================== RECEIPT HAPPY CASES ====================

	describe('✅ Receipt Payment Success Cases', () => {
		it('should process receipt payment (CHECKOUT type) successfully', async () => {
			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockReceipt = {
				_id: new mongoose.Types.ObjectId(),
				paidAmount: 500000,
				amount: 1000000,
				receiptContent: 'Phiếu trả phòng',
				status: 'unpaid',
				buildingId: new mongoose.Types.ObjectId(),
				receiptType: 'checkout',
				management: [{ role: 'owner', user: new mongoose.Types.ObjectId() }],
				room: { roomIndex: '02' },
				buildingName: 'Building B',
				paymentInfo: { _id: new mongoose.Types.ObjectId() },
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(null);
			Services.receipts.findReceiptInfoByPaymentContent.mockResolvedValue(mockReceipt);
			Services.receipts.updateReceiptPaidAmount.mockResolvedValue({
				receiptType: 'checkout',
			});
			Services.checkoutCosts.updateCheckoutCostPaymentStatusByReceiptId.mockResolvedValue({});
			Services.transactions.generateTransferTransactionBySepay.mockResolvedValue({
				_id: new mongoose.Types.ObjectId(),
			});

			session.withTransaction.mockImplementation(async (callback) => await callback());

			const result = await DataProviders.weebhookPayment(mockSepayData);

			expect(result).toBe('Success');
			expect(Services.receipts.updateReceiptPaidAmount).toHaveBeenCalledWith(
				expect.objectContaining({
					paidAmount: 1500000, // 500000 + 1000000
				}),
				session,
			);
			expect(Services.checkoutCosts.updateCheckoutCostPaymentStatusByReceiptId).toHaveBeenCalled();
		});

		it('should process receipt payment (DEPOSIT type) successfully', async () => {
			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockReceipt = {
				_id: new mongoose.Types.ObjectId(),
				paidAmount: 0,
				amount: 1000000,
				receiptContent: 'Phiếu hoàn cọc',
				status: 'unpaid',
				buildingId: new mongoose.Types.ObjectId(),
				receiptType: 'deposit',
				management: [{ role: 'owner', user: new mongoose.Types.ObjectId() }],
				room: { roomIndex: '03' },
				buildingName: 'Building C',
				paymentInfo: { _id: new mongoose.Types.ObjectId() },
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(null);
			Services.receipts.findReceiptInfoByPaymentContent.mockResolvedValue(mockReceipt);
			Services.receipts.updateReceiptPaidAmount.mockResolvedValue({
				receiptType: 'deposit',
			});
			Services.depositRefunds.updateDepositRefundStatusByReceiptId.mockResolvedValue({});
			Services.transactions.generateTransferTransactionBySepay.mockResolvedValue({
				_id: new mongoose.Types.ObjectId(),
			});

			session.withTransaction.mockImplementation(async (callback) => await callback());

			const result = await DataProviders.weebhookPayment(mockSepayData);

			expect(result).toBe('Success');
			expect(Services.depositRefunds.updateDepositRefundStatusByReceiptId).toHaveBeenCalled();
		});
	});

	// ==================== RECEIPT ERROR CASES ====================

	describe('❌ Receipt Error Cases', () => {
		it('should throw BadRequestError if receipt already paid', async () => {
			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockReceipt = {
				_id: new mongoose.Types.ObjectId(),
				paidAmount: 1000000,
				amount: 1000000,
				status: 'paid', // Already paid
				paymentInfo: { _id: new mongoose.Types.ObjectId() },
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(null);
			Services.receipts.findReceiptInfoByPaymentContent.mockResolvedValue(mockReceipt);

			session.withTransaction.mockImplementation(async (callback) => await callback());

			await expect(DataProviders.weebhookPayment(mockSepayData)).rejects.toThrow('Hóa đơn đã được thanh toán !');
		});

		it('should return early if receipt no paymentInfo', async () => {
			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockReceipt = {
				_id: new mongoose.Types.ObjectId(),
				status: 'unpaid',
				paymentInfo: null,
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(null);
			Services.receipts.findReceiptInfoByPaymentContent.mockResolvedValue(mockReceipt);

			session.withTransaction.mockImplementation(async (callback) => await callback());

			const result = await DataProviders.weebhookPayment(mockSepayData);

			expect(result).toBe('Success');
			expect(Services.receipts.updateReceiptPaidAmount).not.toHaveBeenCalled();
		});
	});

	// ==================== UNDETECTED TRANSACTION ====================

	describe('✅ Undetected Transaction', () => {
		it('should create undetected transaction when invoice/receipt not found', async () => {
			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(null);
			Services.receipts.findReceiptInfoByPaymentContent.mockResolvedValue(null);
			Services.transactions.generateUnDetectedTransaction.mockResolvedValue({
				_id: new mongoose.Types.ObjectId(),
			});

			session.withTransaction.mockImplementation(async (callback) => await callback());

			const result = await DataProviders.weebhookPayment(mockSepayData);

			expect(result).toBe('Success');
			expect(Services.transactions.generateUnDetectedTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					bankAccountId: mockBankAccount._id,
					amount: mockSepayData.transferAmount,
					content: mockSepayData.content,
				}),
				session,
			);
		});
	});

	// ==================== TRANSACTION SAFETY ====================

	describe('🔒 Transaction Safety', () => {
		it('should end session even when error occurs', async () => {
			Services.transactions.checkExistedTransaction.mockRejectedValue(new Error('DB error'));

			session.withTransaction.mockImplementation(async (callback) => await callback());

			try {
				await DataProviders.weebhookPayment(mockSepayData);
			} catch (error) {
				// Expected
			}

			expect(session.endSession).toHaveBeenCalled();
		});

		it('should broadcast PROCESSING and SUCCESS status for invoice', async () => {
			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockInvoice = {
				_id: new mongoose.Types.ObjectId(),
				paidAmount: 0,
				total: 1000000,
				status: 'unpaid',
				buildingId: new mongoose.Types.ObjectId(),
				invoiceContent: 'Invoice',
				buildingName: 'Building',
				management: [{ role: 'owner', user: new mongoose.Types.ObjectId() }],
				room: { roomIndex: '01' },
				paymentInfo: { _id: new mongoose.Types.ObjectId() },
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(mockInvoice);
			Services.invoices.updateInvoicePaidStatus.mockResolvedValue({});
			Services.transactions.generateTransferTransactionBySepay.mockResolvedValue({
				_id: new mongoose.Types.ObjectId(),
			});

			session.withTransaction.mockImplementation(async (callback) => await callback());

			await DataProviders.weebhookPayment(mockSepayData);

			// Check PROCESSING broadcast
			expect(mockTransactionManager.broadcast).toHaveBeenCalledWith(
				expect.objectContaining({
					payload: expect.objectContaining({ status: 'processing' }),
				}),
			);

			// Check SUCCESS broadcast
			expect(mockTransactionManager.broadcast).toHaveBeenCalledWith(
				expect.objectContaining({
					payload: expect.objectContaining({ status: 'success' }),
				}),
			);
		});
	});

	// ==================== EDGE CASES ====================

	describe('⚠️ Edge Cases', () => {
		it('should handle zero transfer amount', async () => {
			const zeroAmountData = { ...mockSepayData, transferAmount: 0 };

			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockInvoice = {
				_id: new mongoose.Types.ObjectId(),
				paidAmount: 500000,
				total: 1000000,
				status: 'unpaid',
				buildingId: new mongoose.Types.ObjectId(),
				invoiceContent: 'Invoice',
				buildingName: 'Building',
				management: [{ role: 'owner', user: new mongoose.Types.ObjectId() }],
				room: { roomIndex: '01' },
				paymentInfo: { _id: new mongoose.Types.ObjectId() },
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(mockInvoice);
			Services.invoices.updateInvoicePaidStatus.mockResolvedValue({});
			Services.transactions.generateTransferTransactionBySepay.mockResolvedValue({
				_id: new mongoose.Types.ObjectId(),
			});

			session.withTransaction.mockImplementation(async (callback) => await callback());

			const result = await DataProviders.weebhookPayment(zeroAmountData);

			expect(result).toBe('Success');
			expect(Services.invoices.updateInvoicePaidStatus).toHaveBeenCalledWith(
				expect.objectContaining({ paidAmount: 500000 }), // 500000 + 0
				session,
			);
		});

		it('should handle very large transfer amount', async () => {
			const largeAmountData = { ...mockSepayData, transferAmount: 999999999999 };

			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockInvoice = {
				_id: new mongoose.Types.ObjectId(),
				paidAmount: 0,
				total: 1000000,
				status: 'unpaid',
				buildingId: new mongoose.Types.ObjectId(),
				invoiceContent: 'Invoice',
				buildingName: 'Building',
				management: [{ role: 'owner', user: new mongoose.Types.ObjectId() }],
				room: { roomIndex: '01' },
				paymentInfo: { _id: new mongoose.Types.ObjectId() },
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(mockInvoice);
			Services.invoices.updateInvoicePaidStatus.mockResolvedValue({});
			Services.transactions.generateTransferTransactionBySepay.mockResolvedValue({
				_id: new mongoose.Types.ObjectId(),
			});

			session.withTransaction.mockImplementation(async (callback) => await callback());

			const result = await DataProviders.weebhookPayment(largeAmountData);

			expect(result).toBe('Success');
			expect(Services.invoices.updateInvoicePaidStatus).toHaveBeenCalledWith(expect.objectContaining({ paidAmount: 999999999999 }), session);
		});

		it('should handle management array with mixed roles', async () => {
			const mockBankAccount = {
				_id: new mongoose.Types.ObjectId(),
				accountNumber: mockSepayData.accountNumber,
			};

			const mockInvoice = {
				_id: new mongoose.Types.ObjectId(),
				paidAmount: 0,
				total: 1000000,
				status: 'unpaid',
				buildingId: new mongoose.Types.ObjectId(),
				invoiceContent: 'Invoice',
				buildingName: 'Building',
				management: [
					{ role: 'owner', user: new mongoose.Types.ObjectId() },
					{ role: 'staff', user: new mongoose.Types.ObjectId() }, // Not OWNER/MANAGER
					{ role: 'manager', user: new mongoose.Types.ObjectId() },
				],
				room: { roomIndex: '01' },
				paymentInfo: { _id: new mongoose.Types.ObjectId() },
			};

			Services.transactions.checkExistedTransaction.mockResolvedValue(null);
			Services.bankAccounts.findBankAccountByAccountNumber.mockReturnValue({
				populate: jest.fn().mockReturnThis(),
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockBankAccount),
			});

			Services.invoices.findInvoiceInfoByPaymentContent.mockResolvedValue(mockInvoice);
			Services.invoices.updateInvoicePaidStatus.mockResolvedValue({});
			Services.transactions.generateTransferTransactionBySepay.mockResolvedValue({
				_id: new mongoose.Types.ObjectId(),
			});

			session.withTransaction.mockImplementation(async (callback) => await callback());

			const result = await DataProviders.weebhookPayment(mockSepayData);

			expect(result).toBe('Success');
		});
	});
});
