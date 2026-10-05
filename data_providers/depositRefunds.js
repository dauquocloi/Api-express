const { AppError, InvalidInputError, NotFoundError, BadRequestError, NoDataError, ConflictError, InternalError } = require('../AppError');
const mongoose = require('mongoose');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const Services = require('../service');
const { calculateTotalReceipts } = require('../service/receipts.helper');
const { generateInvoiceFees } = require('../service/invoices.helper');
const { calculateTotalFeeAmount, calculateTotalFeesOther, calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { calculateDepositRefundAmount } = require('../service/depositRefunds.helper');
const { validateFeeIndexMatch } = require('../service/fees.helper');
const {
	receiptTypes,
	receiptStatus,
	invoiceStatus,
	feeUnit,
	debtStatus,
	CHECKOUT_TYPES,
	roomState,
	expenditureType,
	UPDATE_FEE_INDEX_SOURCE,
	depositRefundStatus,
	getDebtsReceiptsUnpaidUsedFor,
} = require('../constants');
const { formatDebts } = require('../service/debts.helper');
const { checkExistPendingTransactions } = require('./depositRefunds.util');
const { getChangedFeeIndexes, createFeeIndexRecordsFromChangedFees } = require('../service/fees.helper');
const uploadFile = require('../utils/uploadFile');
const deleteFileFromS3 = require('../utils/deleteFileFromS3');
const getFileUrl = require('../utils/getFileUrl');
const { isValidImage } = require('../utils/checkIsValidImage');
const deepMutate = require('../utils/deepMutate');

exports.getDepositRefunds = async (buildingId, mode) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const result = await Services.depositRefunds.getDepositRefunds(buildingObjectId, mode);

	return result;
};

exports.getDepositRefundDetail = async (depositRefundId) => {
	const depositRefundObjectId = new mongoose.Types.ObjectId(depositRefundId);
	const depositRefund = await Services.depositRefunds.getDepositRefundDetail(depositRefundObjectId);
	if (depositRefund.image && depositRefund.image !== '') {
		await deepMutate(depositRefund, (key, value, parent) => key === 'image', getFileUrl);
	}

	return depositRefund;
};

exports.getModifyDepositRefundInfo = async (depositRefundId) => {
	const depositRefundObjectId = new mongoose.Types.ObjectId(depositRefundId);
	const depositRefund = await Services.depositRefunds.getDepositRefundDetail(depositRefundObjectId);

	if (depositRefund.invoiceUnpaid !== null && depositRefund.invoiceUnpaid) await Services.invoices.unLockInvoice(depositRefund.invoiceUnpaid._id);
	if (depositRefund.receiptsUnpaid && depositRefund.receiptsUnpaid.length > 0)
		await Services.receipts.unlockManyReceipts(depositRefund.receiptsUnpaid.map((receipt) => receipt._id));
	return depositRefund;
};

exports.confirmDepositRefund = async (data) => {
	let paymentImage = null;
	try {
		const { depositRefundId, spenderId, version, image } = data;

		const currentDepositRefund = await Services.depositRefunds
			.findById(depositRefundId)
			.populate([
				{ path: 'building', select: '_id includeDepositRevenue' },
				{ path: 'room', select: '_id roomIndex' },
			])
			.lean()
			.exec();
		if (!currentDepositRefund) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');
		if (currentDepositRefund.version !== version) throw new ConflictError('Dữ liệu đã bị thay đổi, vui lòng tải lại trang');

		const { room, building, contract } = currentDepositRefund;
		const currentPeriod = await getCurrentPeriod(building);

		if (image && isValidImage(image)) {
			try {
				const imageUploaded = await uploadFile(image, false);
				paymentImage = imageUploaded.Key;
			} catch (error) {
				console.log(error);
			}
		}

		const depositRefundConfirmation = await Services.depositRefunds.confirmDepositRefund({
			depositRefundId,
			version,
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
			status: depositRefundStatus['PAID'],
			image: paymentImage,
		});

		if (building?.includeDepositRevenue === true) {
			const newIncidentalExpenditure = await Services.expenditures.generateExpenditure({
				month: currentPeriod.currentMonth,
				year: currentPeriod.currentYear,
				content: `Hoàn cọc phòng ${room.roomIndex}`,
				amount: currentDepositRefund.depositRefundAmount,
				type: expenditureType['INCIDENTAL'],
				building: building,
				spender: spenderId, // Owner only
			});

			console.log('newIncidentalExpenditure: ', newIncidentalExpenditure);
		}

		return depositRefundConfirmation;
	} catch (error) {
		if (paymentImage)
			try {
				await deleteFileFromS3(paymentImage);
			} catch (error) {
				console.log('delete image failed: ', error);
			}

		throw error;
	}
};

exports.generateDepositRefund = async (data) => {
	const { contractId, roomVersion, feeIndexValues, feesOther, userId, debtsData, stayDays } = data;

	const currentContract = await Services.contracts
		.findById(contractId)
		.populate({ path: 'room', populate: { path: 'building', select: '_id includeDepositRevenue' } })
		.lean()
		.exec();
	if (!currentContract) throw new NotFoundError('Hợp đồng không tồn tại !');
	if (!currentContract.room) throw new NotFoundError('Phòng không tồn tại !');
	if (!currentContract.room.building) throw new NotFoundError('Tòa nhà không tồn tại !');

	const debtsReceiptsUnpaid = await Services.contracts.getDebtsAndReceiptsUnpaid(contractId, getDebtsReceiptsUnpaidUsedFor['DEPOSIT_REFUND']);
	const { invoicesUnpaid, receiptsUnpaid, debts, contract, depositReceipt, fees, room } = debtsReceiptsUnpaid;

	checkExistPendingTransactions([...(receiptsUnpaid ?? []), ...(depositReceipt ?? [])], invoicesUnpaid);

	const currentPeriod = await getCurrentPeriod(currentContract.room.building._id);

	let finalDebts = debtsData?.length ? debts : [];
	const totalDebts = formatDebts(finalDebts).amount;
	const totalReceiptsUnpaid = calculateTotalReceipts(receiptsUnpaid);

	// Lý do invoices có 1 và chỉ 1 phần tử vì hoàn cọc không thể tồn tại invoice tháng đầu tiên !
	const totalInvoiceUnpaid = invoicesUnpaid?.length ? calculateInvoiceUnpaidAmount(invoicesUnpaid[0].amount, invoicesUnpaid[0].paidAmount) : 0;
	const totalFeesOther = calculateTotalFeesOther(feesOther);

	const roomFeeIndex = fees.filter((f) => f.unit === feeUnit['INDEX']);
	const roomFeeIndexIds = roomFeeIndex.map((fee) => fee._id.toString()) || [];
	if (roomFeeIndexIds.length > 0) validateFeeIndexMatch(roomFeeIndexIds, feeIndexValues);

	let formatRoomFees;
	if (invoicesUnpaid.length > 0) {
		formatRoomFees = generateInvoiceFees(roomFeeIndex, 0, 0, feeIndexValues, false);
	} else {
		formatRoomFees = generateInvoiceFees(fees, contract.rent, stayDays, feeIndexValues, true);
	}

	const totalRoomFeeAmount = calculateTotalFeeAmount(formatRoomFees);

	const depositRefundAmount = calculateDepositRefundAmount(
		depositReceipt.paidAmount,
		totalDebts,
		totalReceiptsUnpaid,
		totalInvoiceUnpaid,
		totalFeesOther,
		totalRoomFeeAmount,
	);

	const debtIds = finalDebts?.map((d) => d._id.toString()) || [];
	const receiptIds = receiptsUnpaid.map((r) => r._id.toString());
	const createdDepositRefund = await Services.depositRefunds.createDepositRefund({
		roomId: room._id,
		fees: formatRoomFees,
		feesOther,
		depositRefundAmount,
		invoiceUnpaid: invoicesUnpaid?.length ? invoicesUnpaid[0]._id : null,
		buildingId: currentContract.room.building._id,
		contractId,
		depositReceiptId: depositReceipt._id,
		contractOwnerId: currentContract.customer,
		debtIds,
		receiptIds,
		currentPeriod,
		creatorId: userId,
		stayDays,
	});

	console.log('log of createdDepositRefund', createdDepositRefund);

	await Services.receipts.closeReceiptDeposit({ receiptId: depositReceipt._id });
	if (receiptsUnpaid.length) {
		await Services.receipts.closeAndSetDetucted(receiptIds, CHECKOUT_TYPES['DEPOSIT_REFUND'], createdDepositRefund._id);
	}
	if (debts.length) {
		await Services.debts.closeDebts(room._id);
	}
	if (invoicesUnpaid.length) {
		const invoiceIds = invoicesUnpaid.map((i) => i._id.toString());

		await Services.invoices.closeAndSetDetuctedInvoice({
			invoiceIds: invoiceIds,
			detuctedType: CHECKOUT_TYPES['DEPOSIT_REFUND'],
			detuctedId: createdDepositRefund._id,
		});
	}
	if (currentContract.room.building.includeDepositRevenue) {
		const createdExpenditure = await Services.expenditures.generateExpenditure({
			content: `Hoàn cọc phòng ${currentContract.room.roomIndex}`,
			amount: depositRefundAmount,
			type: expenditureType['INCIDENTAL'],
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
			spender: currentContract.user,
			date: Date.now(),
		});

		console.log('createdExpenditure: ', createdExpenditure);
	}

	await Services.customers.expiredCustomers({ roomId: room._id, contractId: contractId });
	await Services.vehicles.expiredVehicles({ roomId: room._id, contractId: contractId });
	await Services.rooms.generateRoomHistory({
		roomId: room._id,
		contractId: contractId,
		contractCode: contract.contractCode,
		contractSignDate: contract.contractSignDate,
		contractEndDate: contract.contractEndDate,
		depositAmount: depositReceipt.paidAmount,
		checkoutDate: Date.now(),
		checkoutType: CHECKOUT_TYPES['DEPOSIT_REFUND'],
		checkoutCostId: null,
		depositRefundId: createdDepositRefund._id,
		interiors: currentContract.room.interior,
		fees: fees,
		rent: contract.rent,
	});
	await Services.rooms.completeChangeRoomState({ roomId: room._id, roomVersion: roomVersion });
	await Services.contracts.expiredContract(contractId);

	// =========================================================
	// CHECK CHANGED FEE INDEX
	// =========================================================

	const changedFeeMap = getChangedFeeIndexes(fees, formatRoomFees);

	if (changedFeeMap.size > 0) {
		const changedFees = [];

		for (const [feeKey, { toIndex }] of changedFeeMap) {
			changedFees.push({
				feeKey,
				roomId: room._id,
				lastIndex: toIndex,
			});
		}

		await Services.fees.setFeesIndexValue(changedFees);

		const feeIndexRecordsGenerated = await createFeeIndexRecordsFromChangedFees({
			changedFeeMap,
			editorId: userId,
			roomId: room._id,
			fromSource: UPDATE_FEE_INDEX_SOURCE['DEPOSIT_REFUND'],
		});

		console.log('feeIndexRecordsGenerated', feeIndexRecordsGenerated);
	}

	return createdDepositRefund;
};

// Not used
exports.removeDebtsFromDepositRefund = async (depositRefundId) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentDepositRefund = await Services.depositRefunds.findById(depositRefundId).session(session);
			if (!currentDepositRefund) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');
			if (!currentDepositRefund.debts || currentDepositRefund.debts.length === 0) throw new NotFoundError('khoản nợ không tồn tại !');
			const debts = await Services.debts.getDebtsByIds(currentDepositRefund.debts, session);
			const totalDebts = formatDebts(debts).amount;
			await Services.debts.updateDebtsStatus(currentDepositRefund.debts, debtStatus['TERMINATED']);

			const newCheckoutCostTotal = currentDepositRefund.depositRefundAmount - totalDebts;
			currentDepositRefund.depositRefundAmount = newCheckoutCostTotal;
			currentDepositRefund.debts = [];
			currentDepositRefund.version += 1;
			await currentDepositRefund.save({ session });
			return 'Success';
		});
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

// Note: Khi chủ nhà sửa phiếu hoàn cọc => unLock: hóa đơn unpaid để thu tiền.
exports.modifyDepositRefund = async (data) => {
	const { depositRefundId, feesOther = [], feeIndexValues, stayDays, debtsData, version, userId } = data;

	const currentDepositRefund = await Services.depositRefunds
		.findById(depositRefundId)
		.populate('contract depositReceipt invoiceUnpaid receiptsUnpaid debts')
		.lean()
		.exec();
	if (!currentDepositRefund) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');
	if (currentDepositRefund.version !== version) throw new ConflictError('Dữ liệu đã bị thay đổi, vui lòng tải lại trang');

	const {
		feesIndex,
		feesOther: oldFeesOther,
		depositRefundAmount,
		receiptsUnpaid,
		invoiceUnpaid,
		debts,

		contract,
		depositReceipt,
	} = currentDepositRefund;

	const currentFeeIndexIds = feesIndex.map((f) => (f.unit === feeUnit['INDEX'] ? f._id.toString() : null)).filter(Boolean);
	if (currentFeeIndexIds.length > 0) validateFeeIndexMatch(currentFeeIndexIds, feeIndexValues);

	const lastestContractVersion = contract.versions?.length ? contract.versions.reduce((max, v) => (v.version > max.version ? v : max)) : null;

	let formatRoomFees;
	if (!invoiceUnpaid) {
		formatRoomFees = generateInvoiceFees(feesIndex, lastestContractVersion?.rent, stayDays, feeIndexValues, false, 'modify');
	} else {
		formatRoomFees = generateInvoiceFees(feesIndex, 0, 0, feeIndexValues, false, 'modify');
	}

	let finalDebts = debtsData?.length ? debts : [];

	const totalRoomFeeAmount = calculateTotalFeeAmount(formatRoomFees);
	const totalDebts = formatDebts(finalDebts).amount;
	const totalReceiptsUnpaid = calculateTotalReceipts(receiptsUnpaid);
	const totalInvoiceUnpaid = invoiceUnpaid ? calculateInvoiceUnpaidAmount(invoiceUnpaid.amount, invoiceUnpaid.paidAmount) : 0;
	const totalFeesOther = calculateTotalFeesOther(feesOther);

	const newDepositRefundAmount = calculateDepositRefundAmount(
		depositReceipt.paidAmount,
		totalDebts,
		totalReceiptsUnpaid,
		totalInvoiceUnpaid,
		totalFeesOther,
		totalRoomFeeAmount,
	);

	const result = await Services.depositRefunds.modifyDepositRefund({
		depositRefundId,
		feesOther,
		feesIndex: formatRoomFees,
		stayDays,
		debtIds: finalDebts?.map((d) => d._id.toString()) || [],
		newDepositRefundAmount,
		version,
		creator: userId,
	});

	if (debts?.length > 0 && debtsData?.length === 0) {
		await Services.debts.updateDebtsStatus(
			debts.map((d) => d._id.toString()),
			debtStatus['TERMINATED'],
		);
	}
	const changedFeeMap = getChangedFeeIndexes(feesIndex, formatRoomFees);
	if (changedFeeMap.size > 0) {
		const changedFees = [];

		for (const [feeKey, { toIndex }] of changedFeeMap) {
			changedFees.push({
				feeKey,
				roomId: currentDepositRefund.room,
				lastIndex: toIndex,
			});
		}

		await Services.fees.setFeesIndexValue(changedFees);

		const feeIndexRecordsGenerated = await createFeeIndexRecordsFromChangedFees({
			changedFeeMap,
			editorId: userId,
			roomId: currentDepositRefund.room,
			fromSource: UPDATE_FEE_INDEX_SOURCE['MODIFY_DEPOSIT_REFUND'],
		});

		console.log('feeIndexRecordsGenerated', feeIndexRecordsGenerated);
	}

	console.log('result: ', result);

	console.log('newDepositRefundAmount: ', newDepositRefundAmount);

	// throw new InternalError('Stop for testing');

	return result;
};
