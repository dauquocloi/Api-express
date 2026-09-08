const Services = require('../../../service');
const { NotFoundError, NoDataError } = require('../../../AppError');

const { confirmTransaction } = require('../../transactions');

// Mock toàn bộ service
jest.mock('../service');

describe('confirmTransaction', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	/**
	 * Case 1:
	 * Transaction không tồn tại
	 */
	it('should throw NotFoundError when transaction does not exist', async () => {
		Services.transactions.findById.mockReturnValue({
			populate: jest.fn().mockReturnThis(),
			lean: jest.fn().mockReturnThis(),
			exec: jest.fn().mockResolvedValue(null),
		});

		await expect(confirmTransaction('transaction-id')).rejects.toBeInstanceOf(NotFoundError);

		expect(Services.transactions.confirmTransaction).not.toHaveBeenCalled();
	});

	/**
	 * Case 2:
	 * Transaction tồn tại nhưng không có invoice hoặc receipt
	 */
	it('should throw NoDataError when transaction has neither invoice nor receipt', async () => {
		Services.transactions.findById.mockReturnValue({
			populate: jest.fn().mockReturnThis(),
			lean: jest.fn().mockReturnThis(),
			exec: jest.fn().mockResolvedValue({
				_id: 'transaction-id',
				invoice: null,
				receipt: null,
			}),
		});

		await expect(confirmTransaction('transaction-id')).rejects.toBeInstanceOf(NoDataError);

		expect(Services.transactions.confirmTransaction).not.toHaveBeenCalled();
	});

	/**
	 * Case 3:
	 * Transaction có invoice
	 */
	it('should confirm transaction and return invoice information', async () => {
		const invoiceId = 'invoice-id';

		Services.transactions.findById.mockReturnValue({
			populate: jest.fn().mockReturnThis(),
			lean: jest.fn().mockReturnThis(),
			exec: jest.fn().mockResolvedValue({
				_id: 'transaction-id',
				invoice: {
					_id: invoiceId,
				},
				receipt: null,
			}),
		});

		Services.transactions.confirmTransaction.mockResolvedValue({
			success: true,
		});

		const result = await confirmTransaction('transaction-id');

		expect(Services.transactions.confirmTransaction).toHaveBeenCalledTimes(1);

		expect(Services.transactions.confirmTransaction).toHaveBeenCalledWith('transaction-id');

		expect(result).toEqual({
			type: 'invoice',
			invoiceId,
		});
	});

	/**
	 * Case 4:
	 * Transaction có receipt
	 */
	it('should confirm transaction and return receipt information', async () => {
		const receiptId = 'receipt-id';

		Services.transactions.findById.mockReturnValue({
			populate: jest.fn().mockReturnThis(),
			lean: jest.fn().mockReturnThis(),
			exec: jest.fn().mockResolvedValue({
				_id: 'transaction-id',
				invoice: null,
				receipt: {
					_id: receiptId,
				},
			}),
		});

		Services.transactions.confirmTransaction.mockResolvedValue({
			success: true,
		});

		const result = await confirmTransaction('transaction-id');

		expect(Services.transactions.confirmTransaction).toHaveBeenCalledTimes(1);

		expect(Services.transactions.confirmTransaction).toHaveBeenCalledWith('transaction-id');

		expect(result).toEqual({
			type: 'receipt',
			receiptId,
		});
	});
});
