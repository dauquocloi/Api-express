const { default: mongoose } = require('mongoose');
const Services = require('../service');
const { BadRequestError, NoDataError, NotFoundError, InternalError, ConflictError } = require('../AppError');
const { getInvoiceStatus } = require('../service/invoices.helper');
const { notificationJob } = require('../jobs/notification/notification.job');
const { NOTI_TRANSACTION_DECLINED } = require('../jobs/constant/jobNames');
const { client: redis } = require('../config').redisDb;
const { CREATED_BY, OWNER_CONFIRMED_STATUS, paymentConfirmationMode, PAYMENT_METHOD } = require('../constants');
const { billType: BILL_TYPE } = require('../constants/bills');
const { calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { calculateReceiptStatusAfterModified } = require('../service/receipts.helper');
const { calculateCheckoutCostStatus } = require('../service/checkoutCost/checkoutCosts.helper');
const { receiptTypes, depositStatus, checkoutCostStatus } = require('../constants');
const { calculateDepositStatus } = require('../service/deposits.helper');

exports.confirmTransaction = async (transactionId) => {
	const currentTransaction = await Services.transactions.findById(transactionId).populate('invoice receipt').lean().exec();
	if (!currentTransaction) throw new NotFoundError('Giao dịch không tồn tại !');
	if (!currentTransaction.invoice && !currentTransaction.receipt) throw new NoDataError('Giao dịch không đi kèm với bất kỳ hóa đơn nào ! ');

	await Services.transactions.confirmTransaction(transactionId);
	let result;
	if (currentTransaction.invoice) {
		result = {
			type: 'invoice',
			invoiceId: currentTransaction.invoice._id.toString(),
		};
		return result;
	} else if (currentTransaction.receipt) {
		result = {
			type: 'receipt',
			receiptId: currentTransaction.receipt._id.toString(),
		};

		return result;
	}
};

exports.denyTransaction = async (transactionId, reason, buildingId, version) => {
	let session;
	let result;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const building = await Services.buildings.findById(buildingId).session(session).lean().exec();
			if (!building) throw new BadRequestError('Tòa nhà không tồn tại !');
			if (building.paymentConfirmationMode === paymentConfirmationMode['AUTO']) throw new BadRequestError('Chức năng không khả dụng');

			const currentTransaction = await Services.transactions.findById(transactionId).populate('invoice receipt').session(session).lean().exec();
			if (!currentTransaction) throw new NotFoundError('Giao dịch không tồn tại !');
			if (currentTransaction.version !== version) throw new ConflictError('Dữ liệu đã bị thay đổi vui lòng tải lại trang !');

			if (currentTransaction.createdBy === CREATED_BY['SEPAY']) throw new BadRequestError('Giao dịch này không thể được chỉnh sửa !');

			if (currentTransaction.createdBy === CREATED_BY['OWNER']) throw new BadRequestError('Lệnh không hợp lệ !');

			if (currentTransaction.ownerConfirmed === OWNER_CONFIRMED_STATUS['CONFIRMED']) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ');

			if (!currentTransaction.isTransactionDetected) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');

			if (!currentTransaction.invoice && !currentTransaction.receipt) throw new NoDataError('Giao dịch không đi kèm với bất kỳ hóa đơn nào !');

			if (currentTransaction.invoice) {
				const { invoice, amount, collector } = currentTransaction;
				if (invoice.locked === true) throw new BadRequestError('Giao dịch không thể xóa vì hóa đơn đã đóng !');

				const calculateInvoiceUnpaid = calculateInvoiceUnpaidAmount(invoice.paidAmount, currentTransaction.amount);
				const newInvoiceStatus = getInvoiceStatus(calculateInvoiceUnpaid, invoice.total);
				await Services.invoices.updateInvoicePaidStatus(
					{ invoiceId: invoice._id, paidAmount: calculateInvoiceUnpaid, invoiceStatus: newInvoiceStatus },
					session,
				);

				await notificationJob({
					billType: BILL_TYPE['INVOICE'],
					id: invoice._id,
					reason: reason.trim() ?? '',
					receiverId: collector,
					transactionAmount: amount,
					notiType: NOTI_TRANSACTION_DECLINED,
				});

				result = {
					type: BILL_TYPE['INVOICE'],
					invoiceId: invoice._id.toString(),
				};
			}

			if (currentTransaction.receipt) {
				const { receipt } = currentTransaction;
				if (receipt.locked === true) throw new BadRequestError('Giao dịch không thể xóa vì hóa đơn đã đóng !');
				const newReceiptPaidAmount = calculateInvoiceUnpaidAmount(receipt.paidAmount, currentTransaction.amount);
				const newReceiptStatus = calculateReceiptStatusAfterModified(newReceiptPaidAmount, receipt.amount);
				await Services.receipts.updateReceiptPaidAmount(
					{ receiptId: receipt._id, paidAmount: newReceiptPaidAmount, receiptStatus: newReceiptStatus, version: receipt.version },
					session,
				);

				if (receipt.receiptType === receiptTypes['DEPOSIT']) {
					const currentDeposit = await Services.deposits.findByReceiptId(receipt._id).session(session).lean().exec();
					if (!currentDeposit) throw new NotFoundError('Khoản đặt cọc không tồn tại !');
					if ([depositStatus['PARTIAL'], depositStatus['PAID']].includes(currentDeposit.status)) {
						await Services.deposits.updateActualDepositAmountByReceiptId(
							{
								receiptId: receipt._id,
								actualDepositAmount: newReceiptPaidAmount,
								status: calculateDepositStatus(receipt.amount, newReceiptPaidAmount),
							},
							session,
						);
					}
				}
				if (receipt.receiptType === receiptTypes['CHECKOUT']) {
					const currentCheckoutCost = await Services.checkoutCosts.findByReceiptId(receipt._id).session(session).lean().exec();
					if (!currentCheckoutCost) throw new NotFoundError('Khoản chi phí thanh toán khi trả phòng không tồn tại !');
					if (![checkoutCostStatus['TERMINATED']].includes(currentCheckoutCost.status)) {
						const newCheckoutCostStatus = calculateCheckoutCostStatus(currentCheckoutCost.total, newReceiptPaidAmount);
						await Services.checkoutCosts.updateCheckoutCostPaymentStatusByReceiptId(receipt._id, newCheckoutCostStatus, session);
					}
				}

				result = {
					type: BILL_TYPE['RECEIPT'],
					invoiceId: receipt._id.toString(),
				};
			}

			await Services.transactions.updateOwnerConfirmationStatus(
				{ transactionId, ownerConfirmationStatus: OWNER_CONFIRMED_STATUS['DECLINED'], ownerDeclinedReason: reason, version: version },
				session,
			);
		});

		return result;
	} finally {
		if (session) session.endSession();
	}
};

// exports.modifyTransaction = async (transactionId, amount, date) => {};

exports.receiveCashFromManager = async (transactionId, redisKey) => {
	const transaction = await Services.transactions.findById(transactionId).populate('invoice').populate('receipt').lean().exec();
	if (!transaction) throw new NotFoundError('Giao dịch không tồn tại !');
	if (!transaction.invoice && !transaction.receipt) throw new NoDataError('Giao dịch không đi kèm với bất kỳ hóa đơn nào !');
	if (!transaction.isTransactionDetected) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');
	if (transaction.createdBy === CREATED_BY['OWNER']) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');
	if (transaction.ownerConfirmed === OWNER_CONFIRMED_STATUS['CONFIRMED']) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');
	if (transaction.paymentMethod !== PAYMENT_METHOD['CASH']) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');

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

// exports.removeTransaction = async ({ transactionId, buildingId, userId }) => {
// 	let session;
// 	try {
// 		session = await mongoose.startSession();
// 		return await session.withTransaction(async () => {
// 			const building = await Services.buildings.findById(buildingId).session(session).lean().exec();
// 			if (!building) throw new NotFoundError('Tòa nhà không tồn tại !');
// 			if (building.paymentConfirmationMode !== paymentConfirmationMode['MANUAL'])
// 				throw new BadRequestError('Chức năng này chỉ khả dụng khi tòa nhà đang ở chế độ xác nhận thanh toán thủ công !');

// 			const transaction = await Services.transactions.findById(transactionId).populate('invoice receipt').session(session).lean().exec();
// 			if (!transaction) throw new NotFoundError('Giao dịch không tồn tại !');
// 			if (transaction.receipt) {
// 				const { receipt } = transaction;
// 				if (receipt.locked === true) throw new BadRequestError('Giao dịch không thể xóa vì hóa đơn đã đóng !');
// 				const newReceiptPaidAmount = calculateInvoiceUnpaidAmount(receipt.paidAmount, transaction.amount);
// 				const newReceiptStatus = calculateReceiptStatusAfterModified(newReceiptPaidAmount, receipt.amount);
// 				await Services.receipts.updateReceiptPaidAmount(
// 					{ receiptId: receipt._id, paidAmount: newReceiptPaidAmount, receiptStatus: newReceiptStatus, version: receipt.version },
// 					session,
// 				);

// 				if (receipt.receiptType === receiptTypes['DEPOSIT']) {
// 					const currentDeposit = await Services.deposits.findByReceiptId(receipt._id).session(session).lean().exec();
// 					if (!currentDeposit) throw new NotFoundError('Khoản đặt cọc không tồn tại !');
// 					if ([depositStatus['PARTIAL'], depositStatus['PAID']].includes(currentDeposit.status)) {
// 						await Services.deposits.updateActualDepositAmountByReceiptId(
// 							{
// 								receiptId: receipt._id,
// 								actualDepositAmount: newReceiptPaidAmount,
// 								status: calculateDepositStatus(receipt.amount, newReceiptPaidAmount),
// 							},
// 							session,
// 						);
// 					}
// 				}
// 				if (receipt.receiptType === receiptTypes['CHECKOUT']) {
// 					const currentCheckoutCost = await Services.checkoutCosts.findByReceiptId(receipt._id).session(session).lean().exec();
// 					if (!currentCheckoutCost) throw new NotFoundError('Khoản chi phí thanh toán khi trả phòng không tồn tại !');
// 					if (![checkoutCostStatus['TERMINATED']].includes(currentCheckoutCost.status)) {
// 						const newCheckoutCostStatus = calculateCheckoutCostStatus(currentCheckoutCost.total, newReceiptPaidAmount);
// 						await Services.checkoutCosts.updateCheckoutCostPaymentStatusByReceiptId(receipt._id, newCheckoutCostStatus, session);
// 					}
// 				}
// 			} else if (transaction.invoice) {
// 				const { invoice } = transaction;
// 				if (invoice.locked === true) throw new BadRequestError('Giao dịch không thể xóa vì hóa đơn đã đóng !');
// 				const calculateInvoiceUnpaid = calculateInvoiceUnpaidAmount(invoice.paidAmount, transaction.amount);
// 				const newInvoiceStatus = getInvoiceStatus(calculateInvoiceUnpaid, invoice.total);
// 				await Services.invoices.updateInvoicePaidStatus(
// 					{ invoiceId: invoice._id, paidAmount: calculateInvoiceUnpaid, invoiceStatus: newInvoiceStatus },
// 					session,
// 				);
// 			}
// 			await Services.transactions.removeTransaction(transactionId, session);

// 			throw new InternalError('Stop for testing');
// 		});
// 	} finally {
// 		if (session) session.endSession();
// 	}
// };
