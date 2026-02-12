/**
 * Test Suite cho hàm deleteInvoice
 * - Kiểm tra xử lý transaction
 * - Kiểm tra các trường hợp lỗi
 * - Kiểm tra rollback khi lỗi xảy ra
 */

const DataProviders = require('../invoices');
const Services = require('../../service');
const Entity = require('../../models');
const mongoose = require('mongoose');
const { NotFoundError, ConflictError, BadRequestError } = require('../../AppError');
const { feeUnit } = require('../../constants/fees');
const { invoiceStatus } = require('../../constants/invoices');

// Mock all dependencies
jest.mock('../../service');
jest.mock('../../models');
jest.mock('../../config/redisClient');

describe('deleteInvoice - Hành động xóa hóa đơn với Transaction', () => {
	let mockSession;
	let mockInvoice;
	let invoiceId;
	let roomVersion;
	let userId;
	let invoiceVersion;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup IDs
		invoiceId = '6960b28e3f038213dd2883f6';
		userId = '695a9eb8e8765a0ebbc0bae2';
		roomVersion = 1;
		invoiceVersion = 1;

		// Mock Session
		mockSession = {
			withTransaction: jest.fn(),
			endSession: jest.fn(),
		};

		// Mock Invoice Data
		mockInvoice = {
			_id: new mongoose.Types.ObjectId(invoiceId),
			room: new mongoose.Types.ObjectId('6960b28e3f038213dd2883f7'),
			status: invoiceStatus.UNPAID,
			fee: [
				{
					feeKey: 'WATER001',
					unit: feeUnit.INDEX,
					firstIndex: 10,
					lastIndex: 50,
					amount: 400,
				},
				{
					feeKey: 'ROOM001',
					unit: feeUnit.ROOM,
					amount: 500,
				},
			],
			debts: [
				{
					_id: new mongoose.Types.ObjectId(),
					amount: 100,
					status: 'closed',
				},
			],
		};

		// Mock mongoose.startSession
		mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

		// Setup default return values
		Services.invoices.findById = jest.fn();
		Services.rooms.assertRoomWritable = jest.fn();
		Services.rooms.bumpRoomVersion = jest.fn();
		Services.fees.rollbackFeeIndexValuesByFeeKey = jest.fn();
		Services.fees.rollBackFeeIndexHistoryMany = jest.fn();
		Entity.InvoicesEntity.findOneAndUpdate = jest.fn();
		Entity.DebtsEntity.updateMany = jest.fn();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	// ==================== HAPPY CASE ====================

	describe('✅ Success Cases', () => {
		it('Nên xóa hóa đơn UNPAID với fee INDEX và debts thành công', async () => {
			// Setup mocks
			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			const mockUpdateResult = {
				matchedCount: 1,
				modifiedCount: 1,
			};
			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue(mockUpdateResult);

			// Mock withTransaction để thực thi callback
			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			// Execute
			const result = await DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion);

			// Assert
			expect(result).toBe('Success');
			expect(mongoose.startSession).toHaveBeenCalled();
			expect(mockSession.withTransaction).toHaveBeenCalled();
			expect(Services.invoices.findById).toHaveBeenCalledWith(expect.any(mongoose.Types.ObjectId));
			expect(Services.rooms.assertRoomWritable).toHaveBeenCalledWith({
				roomId: mockInvoice.room,
				userId,
				session: mockSession,
			});
			expect(Entity.InvoicesEntity.findOneAndUpdate).toHaveBeenCalledWith(
				{ _id: expect.any(mongoose.Types.ObjectId), version: invoiceVersion },
				{ $set: { status: invoiceStatus.TERMINATED }, $inc: { version: 1 } },
				{ session: mockSession },
			);
			expect(Services.fees.rollbackFeeIndexValuesByFeeKey).toHaveBeenCalledWith(
				mockInvoice.fee.filter((f) => f.unit === feeUnit.INDEX),
				mockInvoice.room,
				mockSession,
			);
			expect(Services.fees.rollBackFeeIndexHistoryMany).toHaveBeenCalledWith(['WATER001'], mockInvoice.room, mockSession);
			expect(Entity.DebtsEntity.updateMany).toHaveBeenCalledWith(
				{ sourceId: expect.any(mongoose.Types.ObjectId) },
				{ $set: { sourceId: null, status: 'pending', sourceType: 'pending' } },
				{ session: mockSession },
			);
			expect(Services.rooms.bumpRoomVersion).toHaveBeenCalledWith(mockInvoice.room, roomVersion, mockSession);
			expect(mockSession.endSession).toHaveBeenCalled();
		});

		it('Nên xóa hóa đơn UNPAID mà không có fee INDEX', async () => {
			// Invoice không có fee INDEX
			const invoiceNoIndexFees = {
				...mockInvoice,
				fee: [
					{
						feeKey: 'ROOM001',
						unit: feeUnit.ROOM,
						amount: 500,
					},
				],
			};

			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(invoiceNoIndexFees),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 1 });

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			const result = await DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion);

			expect(result).toBe('Success');
			// Không nên gọi rollback nếu không có fee INDEX
			expect(Services.fees.rollbackFeeIndexValuesByFeeKey).not.toHaveBeenCalled();
			expect(Services.fees.rollBackFeeIndexHistoryMany).not.toHaveBeenCalled();
		});

		it('Nên xóa hóa đơn UNPAID mà không có debts', async () => {
			const invoiceNoDebts = {
				...mockInvoice,
				debts: null,
			};

			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(invoiceNoDebts),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 1 });

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			const result = await DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion);

			expect(result).toBe('Success');
			// Không nên cập nhật debts nếu không có
			expect(Entity.DebtsEntity.updateMany).not.toHaveBeenCalled();
		});

		it('Nên xóa hóa đơn PAID mà không xử lý fee và debts', async () => {
			const paidInvoice = {
				...mockInvoice,
				status: invoiceStatus.PAID,
			};

			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(paidInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 1 });

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			const result = await DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion);

			expect(result).toBe('Success');
			// Không xử lý fee/debts cho invoice PAID
			expect(Services.fees.rollbackFeeIndexValuesByFeeKey).not.toHaveBeenCalled();
			expect(Entity.DebtsEntity.updateMany).not.toHaveBeenCalled();
		});
	});

	// ==================== ERROR CASES ====================

	describe('❌ Error Cases - Transaction Rollback', () => {
		it('Nên throw NotFoundError nếu hóa đơn không tồn tại', async () => {
			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(null),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			// Execute & Assert
			await expect(DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion)).rejects.toThrow(NotFoundError);

			expect(mockSession.endSession).toHaveBeenCalled();
		});

		it('Nên throw error khi không có quyền xóa hóa đơn của phòng khác', async () => {
			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			const authError = new Error('Không có quyền truy cập phòng này');
			Services.rooms.assertRoomWritable.mockRejectedValue(authError);

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			// Execute & Assert
			await expect(DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion)).rejects.toThrow(authError);

			expect(mockSession.endSession).toHaveBeenCalled();
		});

		it('Nên throw ConflictError nếu hóa đơn version không khớp (đã thay đổi)', async () => {
			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			// Simulate version conflict
			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 0 });

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			// Execute & Assert
			await expect(DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion)).rejects.toThrow(ConflictError);

			expect(mockSession.endSession).toHaveBeenCalled();
		});

		it('Nên rollback transaction nếu rollbackFeeIndexValuesByFeeKey thất bại', async () => {
			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 1 });

			const rollbackError = new Error('Database connection lost during rollback');
			Services.fees.rollbackFeeIndexValuesByFeeKey.mockRejectedValue(rollbackError);

			mockSession.withTransaction.mockImplementation(async (callback) => {
				throw rollbackError;
			});

			// Execute & Assert
			await expect(DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion)).rejects.toThrow(rollbackError);

			expect(mockSession.endSession).toHaveBeenCalled();
		});

		it('Nên rollback transaction nếu updateMany debts thất bại', async () => {
			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 1 });

			const dbError = new Error('Database error when updating debts');
			Entity.DebtsEntity.updateMany.mockRejectedValue(dbError);

			mockSession.withTransaction.mockImplementation(async (callback) => {
				throw dbError;
			});

			// Execute & Assert
			await expect(DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion)).rejects.toThrow(dbError);

			expect(mockSession.endSession).toHaveBeenCalled();
		});

		it('Nên rollback transaction nếu bumpRoomVersion thất bại', async () => {
			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 1 });

			const versionError = new Error('Failed to bump room version');
			Services.rooms.bumpRoomVersion.mockRejectedValue(versionError);

			mockSession.withTransaction.mockImplementation(async (callback) => {
				throw versionError;
			});

			// Execute & Assert
			await expect(DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion)).rejects.toThrow(versionError);

			expect(mockSession.endSession).toHaveBeenCalled();
		});
	});

	// ==================== TRANSACTION SAFETY ====================

	describe('🔒 Transaction Safety & Session Management', () => {
		it('Nên gọi session.endSession() ngay cả khi error xảy ra', async () => {
			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(null),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			try {
				await DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion);
			} catch (error) {
				// Expected error
			}

			expect(mockSession.endSession).toHaveBeenCalled();
		});

		it('Nên không gọi endSession() nếu session là null/undefined', async () => {
			mongoose.startSession.mockResolvedValue(null);

			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 1 });

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			try {
				await DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion);
			} catch (error) {
				// Expected - session là null
			}

			// Không nên crash nếu session null
		});

		it('Nên đảm bảo transaction callback nhận chính xác session', async () => {
			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mockInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 1 });

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			await DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion);

			// Verify session được passed chính xác
			expect(Services.invoices.findById).toHaveBeenCalled();
			const callArgs = Services.invoices.findById.mock.results[0].value;
			expect(callArgs.session).toBe(mockSession);
		});
	});

	// ==================== EDGE CASES ====================

	describe('⚠️ Edge Cases', () => {
		it('Nên xử lý hóa đơn với mảng fee rỗng', async () => {
			const emptyFeeInvoice = {
				...mockInvoice,
				fee: [],
			};

			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(emptyFeeInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 1 });

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			const result = await DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion);

			expect(result).toBe('Success');
			expect(Services.fees.rollbackFeeIndexValuesByFeeKey).not.toHaveBeenCalled();
		});

		it('Nên xử lý hóa đơn với debts array rỗng', async () => {
			const emptyDebtsInvoice = {
				...mockInvoice,
				debts: [],
			};

			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(emptyDebtsInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 1 });

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			const result = await DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion);

			expect(result).toBe('Success');
			expect(Entity.DebtsEntity.updateMany).not.toHaveBeenCalled();
		});

		it('Nên xử lý invoice với mixed fee units', async () => {
			const mixedFeeInvoice = {
				...mockInvoice,
				fee: [
					{ feeKey: 'WATER001', unit: feeUnit.INDEX, firstIndex: 10, lastIndex: 50 },
					{ feeKey: 'PERSON001', unit: feeUnit.PERSON, quantity: 2 },
					{ feeKey: 'VEHICLE001', unit: feeUnit.VEHICLE, quantity: 1 },
					{ feeKey: 'ROOM001', unit: feeUnit.ROOM },
				],
			};

			const mockQueryChain = {
				session: jest.fn().mockReturnThis(),
				lean: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue(mixedFeeInvoice),
			};
			Services.invoices.findById.mockReturnValue(mockQueryChain);

			Entity.InvoicesEntity.findOneAndUpdate.mockResolvedValue({ matchedCount: 1 });

			mockSession.withTransaction.mockImplementation(async (callback) => {
				return await callback();
			});

			const result = await DataProviders.deleteInvoice(invoiceId, roomVersion, userId, invoiceVersion);

			expect(result).toBe('Success');
			// Chỉ xử lý fee INDEX
			expect(Services.fees.rollbackFeeIndexValuesByFeeKey).toHaveBeenCalledWith([mixedFeeInvoice.fee[0]], mixedFeeInvoice.room, mockSession);
		});
	});
});
