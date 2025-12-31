const mongoose = require('mongoose');
const Services = require('../service');
const { NotFoundError, ConflictError, BadRequestError } = require('../AppError');
const { formatDebts } = require('../service/debts.helper');
const { version } = require('pdfkit');
const { generateInvoiceFees } = require('../service/invoices.helper');
const { calculateTotalFeeAmount, calculateTotalFeesOther } = require('../utils/calculateFeeTotal');
const { feeUnit } = require('../constants/fees');
const { validateFeeIndexMatch } = require('../service/fees.helper');
const { receiptStatus } = require('../constants/receipt');

exports.getCheckoutCostDetail = async (checkoutCostId) => {
	const checkoutCostObjectId = new mongoose.Types.ObjectId(checkoutCostId);

	const result = await Services.checkoutCosts.getCheckoutCostDetail(checkoutCostObjectId);

	return result;
};

exports.getModifyCheckoutCostInfo = async (checkoutCostId) => {
	let session;
	let result;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const checkoutCostObjectId = new mongoose.Types.ObjectId(checkoutCostId);
			const checkoutCost = await Services.checkoutCosts.getCheckoutCostDetail(checkoutCostObjectId);

			if (checkoutCost.invoiceUnpaid && checkoutCost.invoiceUnpaid !== null) {
				await Services.invoices.unLockInvoice(checkoutCost.invoiceUnpaid._id, session);
			}
			if (checkoutCost?.receiptsUnpaid && checkoutCost?.receiptsUnpaid?.length > 0) {
				await Services.receipts.unlockManyReceipts(
					checkoutCost.receiptsUnpaid.map((r) => r._id),
					session,
				);
			}
			result = checkoutCost;
			return;
		});
		return result;
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.removeDebtsFromCheckoutCost = async (checkoutCostId) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentCheckOutCost = await Services.checkoutCosts.findById(checkoutCostId).session(session);
			if (currentCheckOutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại !');
			if (!currentCheckOutCost.debts || currentCheckOutCost.debts.length === 0) throw new NotFoundError('khoản nợ không tồn tại !');
			const debts = await Services.debts.getDebtsByIds(currentCheckOutCost.debts, session);
			const totalDebts = formatDebts(debts).amount;
			await Services.debts.terminateDebts(currentCheckOutCost.debts, session);

			const newCheckoutCostTotal = currentCheckOutCost.total - totalDebts;
			currentCheckOutCost.total = newCheckoutCostTotal;
			currentCheckOutCost.debts = [];
			currentCheckOutCost.version += 1;
			await currentCheckOutCost.save({ session });
			return 'Success';
		});

		return 'Success';
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.modifyCheckoutCost = async (checkoutCostId, version, feeIndexValues, stayDays, feesOther, userId) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentCheckoutCost = await Services.checkoutCosts.findById(checkoutCostId).session(session).populate('checkoutCostReceipt');
			if (!currentCheckoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại !');
			if (version !== currentCheckoutCost.version) throw new ConflictError(`Dữ liệu này đã bị thay đổi`);

			const { fees, feesOther: oldFeesOther, invoiceUnpaid, total, checkoutCostReceipt } = currentCheckoutCost;
			let currentFeeIndexs = fees.map((f) => (f.unit === feeUnit['INDEX'] ? f._id.toString() : null)).filter(Boolean);
			if (currentFeeIndexs.length > 0) {
				validateFeeIndexMatch(currentFeeIndexs, feeIndexValues);
			}

			let totalCurrentRoomFees = calculateTotalFeeAmount(fees);
			let totalCurrentOtherFees = calculateTotalFeesOther(oldFeesOther);

			let formatRoomFees;
			if (!invoiceUnpaid) {
				formatRoomFees = generateInvoiceFees(fees, 0, stayDays, feeIndexValues, true, 'modify');
			} else {
				formatRoomFees = generateInvoiceFees(fees, 0, 0, feeIndexValues, false, 'modify');
			}
			const totalRoomFees = calculateTotalFeeAmount(formatRoomFees);
			const totalOtherFees = calculateTotalFeesOther(feesOther);

			const currentCheckoutCostTotalWithoutRoomFeesAndDebts = total - (totalCurrentRoomFees + totalCurrentOtherFees);
			const newCheckoutCostTotal = currentCheckoutCostTotalWithoutRoomFeesAndDebts + totalRoomFees + totalOtherFees;
			console.log('log of newCheckoutCostTotal: ', newCheckoutCostTotal);

			await Services.receipts.modifyReceipt(
				{
					receiptObjectId: checkoutCostReceipt._id,
					receiptAmount: newCheckoutCostTotal,
					receiptContent: checkoutCostReceipt.receiptContent,
					receiptVersion: checkoutCostReceipt.version,
				},
				session,
			);
			await Services.checkoutCosts.modifyCheckoutCost(
				{ checkoutCostId, version, fees: formatRoomFees, feesOther, newTotal: newCheckoutCostTotal },
				session,
			);

			let currentFeeIndexKeys = fees.map((f) => (f.unit == feeUnit['INDEX'] ? f.feeKey : null)).filter(Boolean);
			let modifyFeeIndex = formatRoomFees.map((f) => (f.unit === feeUnit['INDEX'] ? f : null)).filter(Boolean);
			console.log('log of modifyFeeIndex: ', modifyFeeIndex);
			console.log('log of currentFeeIndexKeys: ', currentFeeIndexKeys);
			await Services.fees.updateFeeIndexValuesByFeeKey(currentFeeIndexKeys, currentCheckoutCost.roomId, modifyFeeIndex, session);

			return 'Success';
		});
		return 'Success';
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.terminateCheckoutCost = async (checkoutCostId, version) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentCheckoutCost = await Services.checkoutCosts
				.findById(checkoutCostId)
				.session(session)
				.populate('checkoutCostReceipt')
				.lean()
				.exec();
			if (!currentCheckoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại !');
			if (version !== currentCheckoutCost.version) throw new ConflictError(`Dữ liệu này đã bị thay đổi`);
			const isRoomDeposited = await Services.rooms.checkRoomDeposited(currentCheckoutCost.roomId, session);
			console.log('isRoomDeposited: ', isRoomDeposited);
			if (isRoomDeposited === true) throw new BadRequestError('Phòng đã được đặt cọc, không thể hủy phiếu trả phòng');

			const { checkoutCostReceipt, receiptsUnpaid, invoiceUnpaid, fees } = currentCheckoutCost;
			if (checkoutCostReceipt.status === receiptStatus['PAID'] || checkoutCostReceipt.status === receiptStatus['PARTIAL']) {
				throw new BadRequestError('Không thể xóa phiếu đã thanh toán');
			}
			if (invoiceUnpaid) {
				await Services.invoices.rollBackInvoiceAtCheckoutCost(invoiceUnpaid._id, session);
			}
			if (Array.isArray(receiptsUnpaid) && receiptsUnpaid.length > 0) {
				await Services.receipts.rollBackManyDetuctedReceipts(receiptsUnpaid, session);
			}

			let currentFeeIndexs = fees.filter((f) => f.unit == feeUnit['INDEX']);
			if (currentFeeIndexs.length > 0) {
				await Services.fees.rollbackFeeIndexValuesByFeeKey(currentFeeIndexs, currentCheckoutCost.roomId, session);
			}

			await Services.receipts.terminateReceipt(checkoutCostReceipt._id, checkoutCostReceipt.version, session);
			await Services.checkoutCosts.terminateCheckoutCost(checkoutCostId, version, session);

			return 'Success';
		});
		return 'Success';
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};
