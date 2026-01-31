const mongoose = require('mongoose');
var Entity = require('../models');
const { AppError, BadRequestError, InternalError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const Services = require('../service');
const { receiptStatus, receiptTypes: RECEIPT_TYPES } = require('../constants/receipt');
const { calculateReceiptStatusAfterModified } = require('../service/receipts.helper');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { invoiceStatus } = require('../constants/invoices');
const ROLES = require('../constants/userRoles');
const { NotiPaymentJob } = require('../jobs/Notifications');
const { getTransactionManager } = require('../instance');
const { TRANS_STATUS } = require('../constants/transactions');
const { billType: BILL_TYPE } = require('../constants/bills');
const { checkoutCostStatus: CHECKOUT_COST_STATUS, receiptToCheckoutCostStatusMap } = require('../constants/checkoutCosts');
const { receiptToDepositRefundStatusMap } = require('../constants/deposits');

exports.handleSepayIPN = (data) => {
	let session;
	try {
		if (data.transfer_type === 'credit') {
			const tracsactionContent = data.content;
		}
	} catch (error) {
		next(error);
	}
};

exports.collectCashFromEmployee = async (data, cb, next) => {
	try {
		const transactionObjectId = new mongoose.Types.ObjectId(data.transactionId);
		const ownerObjectId = new mongoose.Types.ObjectId(data.userId);

		const transaction = await Entity.TransactionsEntity.findOne({ _id: transactionObjectId });
		if (!transaction) {
			throw new AppError(errorCodes.notExist, `Giao dịch không tồn tại!`, 200);
		}

		transaction.collector = ownerObjectId;
		await transaction.save();

		cb(null, { type: transaction.invoice == null ? 'receipt' : 'invoice' });
	} catch (error) {
		next(error);
	}
};

{
	/*
	{
    "id": 92704,                              // ID giao dịch trên SePay
    "gateway":"Vietcombank",                  // Brand name của ngân hàng
    "transactionDate":"2023-03-25 14:02:37",  // Thời gian xảy ra giao dịch phía ngân hàng
    "accountNumber":"0123499999",              // Số tài khoản ngân hàng
    "code":null,                               // Mã code thanh toán (sepay tự nhận diện dựa vào cấu hình tại Công ty -> Cấu hình chung)
    "content":"chuyen tien mua iphone",        // Nội dung chuyển khoản
    "transferType":"in",                       // Loại giao dịch. in là tiền vào, out là tiền ra
    "transferAmount":2277000,                  // Số tiền giao dịch
    "accumulated":19077000,                    // Số dư tài khoản (lũy kế)
    "subAccount":null,                         // Tài khoản ngân hàng phụ (tài khoản định danh),
    "referenceCode":"MBVCB.3278907687",         // Mã tham chiếu của tin nhắn sms
    "description":""                           // Toàn bộ nội dung tin nhắn sms
}
 */
}
exports.weebhookPayment = async (sepayData) => {
	let session;
	let result;
	let redisIdempo;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const existedTransaction = await Services.transactions.checkExistedTransaction(sepayData.id, session);
			if (existedTransaction) return;

			const bankAccount = await Services.bankAccounts
				.findBankAccountByAccountNumber(sepayData.accountNumber)
				.populate('user')
				.session(session)
				.lean()
				.exec();
			if (!bankAccount) throw new BadRequestError('Số tài khoản không khớp với bất kỳ tài khoản nào trong hệ thống !');

			const findInvoice = await Services.invoices.findInvoiceInfoByPaymentContent(sepayData.content, session);
			if (findInvoice) {
				if (!findInvoice.paymentInfo || findInvoice.paymentInfo === null) {
					return 'Success'; // tell Sepay it Oke but not recornited paymentInfo
				}
				const { _id, paidAmount, total, status, buildingId, invoiceContent, buildingName, management, room, paymentInfo } = findInvoice;

				if (status === invoiceStatus['PAID']) throw new BadRequestError('Hóa đơn đã được thanh toán !');
				const transaction = getTransactionManager();
				transaction.broadcast({
					type: 'invoice',
					id: _id.toString(),
					payload: {
						status: TRANS_STATUS['PROCESSING'],
						message: 'Đang xử lý giao dịch',
						metadata: {},
					},
				});

				const newPaidAmount = paidAmount + sepayData.transferAmount;
				const getNewInvoiceStatus = calculateReceiptStatusAfterModified(newPaidAmount, total);
				const invoiceStatusUpdates = await Services.invoices.updateInvoicePaidStatus(
					{
						invoiceId: _id,
						paidAmount: newPaidAmount,
						invoiceStatus: getNewInvoiceStatus,
					},
					session,
				);

				const currentPeriod = await getCurrentPeriod(buildingId);

				const transactionGenerated = await Services.transactions.generateTransferTransactionBySepay(
					{
						bankAccountId: paymentInfo._id,
						transactionDate: new Date(sepayData.transactionDate),
						accountNumber: paymentInfo.accountNumber,
						paymentCode: sepayData.code,
						content: sepayData.content,
						referenceCode: sepayData.referenceCode,
						transactionId: sepayData.id,
						amount: sepayData.transferAmount,
						gateway: sepayData.gateway,
						idempotencyKey: sepayData.id,
						currentPeriod: currentPeriod,
						invoice: _id,
						receipt: null,
					},
					session,
				);

				const listManagementIds = management
					.map((m) => {
						if (m.role === ROLES['OWNER'] || m.role === ROLES['MANAGER']) return m.user;
					})
					.filter(Boolean);

				transaction.broadcast({
					type: 'invoice',
					id: _id.toString(),
					payload: {
						status: TRANS_STATUS['SUCCESS'],
						message: 'Hoàn tất giao dịch',
						metaData: {
							_id: transactionGenerated._id,
							accountNumber: transactionGenerated.accountNumber,
						},
					},
				});

				await new NotiPaymentJob().enqueue({
					managementIds: listManagementIds,
					amount: sepayData.transferAmount,
					paymentContent: sepayData.content.trim(),
					billContent: invoiceContent,
					buildingName: buildingName,
					roomIndex: room.roomIndex,
					billType: BILL_TYPE['INVOICE'],
					billStatus: getNewInvoiceStatus,
					billId: _id,
				});

				return 'Success';
			}

			const findReceipt = await Services.receipts.findReceiptInfoByPaymentContent(sepayData.content, session);
			console.log('log of findReceipt: ', findReceipt);
			if (findReceipt) {
				if (!findReceipt.paymentInfo || findReceipt.paymentInfo === null) return 'Success';
				const { paidAmount, receiptContent, amount, _id, status, buildingId, management, room, buildingName, receiptType, paymentInfo } =
					findReceipt;
				if (status === receiptStatus['PAID']) throw new BadRequestError('Hóa đơn đã được thanh toán !');

				const transaction = getTransactionManager();
				transaction.broadcast({
					type: 'receipt',
					id: _id.toString(),
					payload: {
						status: TRANS_STATUS['PROCESSING'],
						message: 'Đang xử lý giao dịch',
						metadata: {},
					},
				});

				const newPaidAmount = paidAmount + sepayData.transferAmount;
				const getNewReceiptStatus = calculateReceiptStatusAfterModified(newPaidAmount, amount);

				const receiptStatusUpdated = await Services.receipts.updateReceiptPaidAmount(
					{
						receiptId: _id,
						paidAmount: newPaidAmount,
						receiptStatus: getNewReceiptStatus,
					},
					session,
				);

				const currentPeriod = await getCurrentPeriod(buildingId);

				const transactionGenerated = await Services.transactions.generateTransferTransactionBySepay(
					{
						bankAccountId: paymentInfo._id,
						transactionDate: new Date(sepayData.transactionDate),
						accountNumber: paymentInfo.accountNumber,
						paymentCode: sepayData.code,
						content: sepayData.content,
						referenceCode: sepayData.referenceCode,
						transactionId: sepayData.id,
						amount: sepayData.transferAmount,
						gateway: sepayData.gateway,
						idempotencyKey: sepayData.id,
						currentPeriod: currentPeriod,
						invoice: null,
						receipt: _id,
					},
					session,
				);

				if (receiptType === RECEIPT_TYPES['CHECKOUT']) {
					let newCheckoutCostStatus;

					newCheckoutCostStatus = receiptToCheckoutCostStatusMap[getNewReceiptStatus];
					await Services.checkoutCosts.updateCheckoutCostPaymentStatusByReceiptId(_id, newCheckoutCostStatus, session);
				} else if (receiptType === RECEIPT_TYPES['DEPOSIT']) {
					let newDepositRefundStatus;
					newDepositRefundStatus = receiptToDepositRefundStatusMap[getNewReceiptStatus];
					await Services.depositRefunds.updateDepositRefundStatusByReceiptId(_id, newDepositRefundStatus, session);
				}

				//=====NOTIFICATION======//
				const listManagementIds = management
					.map((m) => {
						if (m.role === ROLES['OWNER'] || m.role === ROLES['MANAGER']) return m.user;
					})
					.filter(Boolean);
				await new NotiPaymentJob().enqueue({
					managementIds: listManagementIds,
					amount: sepayData.transferAmount,
					paymentContent: sepayData.content.trim(),
					billContent: receiptContent,
					buildingName: buildingName,
					roomIndex: room.roomIndex,
					billType: BILL_TYPE['RECEIPT'],
					billStatus: getNewReceiptStatus,
					billId: _id,
				});

				transaction.broadcast({
					type: 'receipt',
					id: _id.toString(),
					payload: {
						status: TRANS_STATUS['SUCCESS'],
						message: 'Hoàn tất giao dịch',
						metaData: {
							_id: transactionGenerated._id,
							accountNumber: transactionGenerated.accountNumber,
							receiptType: receiptStatusUpdated.receiptType,
						},
					},
				});

				return 'Success';
			}

			await Services.transactions.generateUnDetectedTransaction(
				{
					bankAccountId: bankAccount._id,
					transactionDate: new Date(sepayData.transactionDate),
					accountNumber: bankAccount.accountNumber,
					paymentCode: sepayData.code,
					content: sepayData.content,
					amount: sepayData.transferAmount,
					referenceCode: sepayData.referenceCode,
					transactionId: sepayData.id,
					idempotencyKey: sepayData.id,
				},
				session,
			);
		});

		return 'Success';
	} catch (error) {
		throw error;
	} finally {
		if (session) {
			session.endSession();
		}
	}
};
