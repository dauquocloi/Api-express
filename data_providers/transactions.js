const { default: mongoose } = require('mongoose');
const Services = require('../service');
const { CREATED_BY, OWNER_CONFIRMED_STATUS } = require('../constants/transactions');
const { BadRequestError, NoDataError, NotFoundError } = require('../AppError');
const { getInvoiceStatus } = require('../service/invoices.helper');
const { NotiTransactionDeclinedJob } = require('../jobs/Notifications');
const redis = require('../config/redisClient');

exports.confirmTransaction = async (transactionId, redisKey) => {
	const currentTransaction = await Services.transactions.findById(transactionId).populate('invoice receipt').lean().exec();
	if (!currentTransaction) throw new NotFoundError('Giao dịch không tồn tại !');
	if (!currentTransaction.invoice && !currentTransaction.receipt) throw new NoDataError('Giao dịch không đi kèm với bất kỳ hóa đơn nào ! ');

	await Services.transactions.confirmTransaction(transactionId);
	if (currentTransaction.invoice) {
		const result = {
			type: 'invoice',
			invoiceId: currentTransaction.invoice._id.toString(),
		};
		await redis.set(redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
		return result;
	} else if (currentTransaction.receipt) {
		const result = {
			type: 'receipt',
			receiptId: currentTransaction.receipt._id.toString(),
		};

		await redis.set(redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
		return result;
	}
};

exports.denyTransaction = async (transactionId, reason, redisKey) => {
	let session;
	let result;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentTransaction = await Services.transactions
				.findById(transactionId)
				.populate('invoice')
				.populate('receipt')
				.session(session)
				.lean()
				.exec();

			if (!currentTransaction) throw new NotFoundError('Giao dịch không tồn tại !');

			if (currentTransaction.createdBy === CREATED_BY['SEPAY']) throw new BadRequestError('Giao dịch này không thể được chỉnh sửa !');

			if (currentTransaction.createdBy === CREATED_BY['OWNER']) throw new BadRequestError('Lệnh không hợp lệ !');

			if (currentTransaction.ownerConfirmed === OWNER_CONFIRMED_STATUS['CONFIRMED']) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ');

			if (!currentTransaction.isTransactionDetected) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');

			if (!currentTransaction.invoice && !currentTransaction.receipt) throw new NoDataError('Giao dịch không đi kèm với bất kỳ hóa đơn nào !');

			if (currentTransaction.invoice) {
				const { invoice, amount, collector } = currentTransaction;

				if (invoice.locked === true) {
					await Services.transactions.transformCashPaymentMethod(transactionId, session);
				} else {
					const updatedTotalPaid = Math.max(invoice.paidAmount - amount, 0);
					const newInvoiceStatus = getInvoiceStatus(updatedTotalPaid, invoice.total);

					await Services.invoices.updateInvoicePaidStatusWithVersion(
						{ invoiceId: invoice._id, paidAmount: updatedTotalPaid, invoiceStatus: newInvoiceStatus, version: invoice.version },
						session,
					);

					await Services.transactions.removeTransaction(transactionId, session);
				}

				await new NotiTransactionDeclinedJob().enqueue({
					billType: 'invoice',
					id: invoice._id,
					reason: reason ?? '',
					receiverId: collector,
					transactionAmount: amount,
				});

				result = {
					type: 'invoice',
					invoiceId: invoice._id.toString(),
				};

				return result;
			}

			if (currentTransaction.receipt) {
				const { receipt, amount, collector } = currentTransaction;

				if (receipt.locked === true) {
					await Services.transactions.transformCashPaymentMethod(transactionId, session);
				} else {
					const updateTotalPaidAmount = Math.max(receipt.paidAmount - amount, 0);
					const newReceiptStatus = getInvoiceStatus(updateTotalPaidAmount, receipt.amount);

					await Services.receipts.updateReceiptPaidStatusWithVersion(
						{ receiptId: receipt._id, paidAmount: updateTotalPaidAmount, receiptStatus: newReceiptStatus, version: receipt.version },
						session,
					);

					await Services.transactions.removeTransaction(transactionId, session);
				}

				await new NotiTransactionDeclinedJob().enqueue({
					billType: 'receipt',
					id: receipt._id,
					reason: reason ?? '',
					receiverId: collector,
					transactionAmount: amount,
				});

				result = {
					type: 'receipt',
					receiptId: receipt._id.toString(),
				};

				return result;
			}
		});

		await redis.set(redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
		return result;
	} catch (error) {
		await redis.set(redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

// exports.modifyTransaction = async (transactionId, amount, date) => {};s

exports.receiveCashFromManager = async (transactionId, redisKey) => {
	const transaction = await Services.transactions.findById(transactionId).populate('invoice').populate('receipt').lean().exec();
	if (!transaction) throw new NotFoundError('Giao dịch không tồn tại !');
	if (!transaction.invoice && !transaction.receipt) throw new NoDataError('Giao dịch không đi kèm với bất kỳ hóa đơn nào !');
	if (!transaction.isTransactionDetected) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');
	if (transaction.createdBy === CREATED_BY['OWNER']) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');
	if (transaction.ownerConfirmed === OWNER_CONFIRMED_STATUS['CONFIRMED']) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');
	if (transaction.paymentMethod !== 'cash') throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');

	await Services.transactions.confirmTransaction(transactionId);
	if (transaction.invoice) {
		const result = {
			type: 'invoice',
			invoiceId: transaction.invoice._id.toString(),
		};
		await redis.set(redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
		return result;
	} else if (transaction.receipt) {
		const result = {
			type: 'receipt',
			receiptId: transaction.receipt._id.toString(),
		};
		await redis.set(redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
		return result;
	}
};
