const mongoose = require('mongoose');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { AppError, NoEntryError, NotFoundError, BadRequestError, ConflictError, InternalError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const zaloService = require('../service/zalo.service');
const Services = require('../service');
const { formatDebts } = require('../service/debts.helper');
const { calculateTotalFeeAmount, calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { generateInvoiceFees } = require('../service/invoices.helper');
const { getInvoiceStatus } = require('../service/invoices.helper');
const {
	billType,
	invoiceStatus,
	invoiceType,
	feeUnit,
	PAYMENT_METHOD,
	DETUCTED_TYPE,
	UPDATE_FEE_INDEX_SOURCE,
	sourceType,
	debtStatus,
} = require('../constants');
const { znsNewInvoiceNotiJob } = require('../jobs/ZNS/zns.job');
const Roles = require('../constants/userRoles');
const { notificationJob } = require('../jobs/notification/notification.job');
const { NOTI_MANAGER_COLLECT_CASH_INVOICE } = require('../jobs/constant/jobNames');
const {
	formatFeeIndexRecords,
	getChangedFeeIndexes,
	createFeeIndexRecordsFromChangedFees,
	getFeeIndexesForRollback,
} = require('../service/fees.helper');
const { validateFeeIndexMatch } = require('../service/fees.helper');

exports.getInvoicesPaymentStatus = async (buildingId, month, year) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	if (!month || !year) {
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		month = currentPeriod.currentMonth;
		year = currentPeriod.currentYear;
	} else {
		Number(month);
		Number(year);
	}

	const listInvoice = await Services.invoices.getInvoicesPaymentStatus({ buildingId, month, year });
	const { listInvoicePaymentStatus } = listInvoice;

	return {
		currentPeriod: {
			currentMonth: Number(month),
			currentYear: Number(year),
		},
		listInvoicePaymentStatus: listInvoicePaymentStatus,
	};
};

exports.getInvoiceSendingStatus = async (buildingId) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const { currentMonth, currentYear } = currentPeriod;

	const invoiceStatus = await Services.invoices.getInvoicesSendingStatus({ buildingId: buildingId, month: currentMonth, year: currentYear });
	const { listInvoiceInfo } = invoiceStatus;

	return { currentPeriod, listInvoiceInfo };
};

exports.modifyInvoice = async (data) => {
	const { invoiceId, feeIndexValues, stayDays, version, userId } = data;

	const currentInvoice = await Services.invoices.findById(invoiceId).lean().exec();
	if (!currentInvoice) throw new NotFoundError('Hóa đơn không tồn tại');
	if (currentInvoice.locked === true) throw new BadRequestError('Hóa đơn đã đóng');
	if (version !== currentInvoice.version) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');

	await Services.rooms.assertRoomWritable({ roomId: currentInvoice.room, userId });

	const formatFees = generateInvoiceFees(currentInvoice.fee, 0, stayDays, feeIndexValues, false, 'modify');
	const totalRoomfees = calculateTotalFeeAmount(formatFees);

	const totalDebts = currentInvoice.debts?.reduce((sum, debt) => sum + debt.amount, 0) ?? 0;

	const newTotalInvoice = totalRoomfees + totalDebts;
	const invoiceStatus = getInvoiceStatus(currentInvoice.paidAmount, newTotalInvoice);

	// =========================================================
	// CHECK CHANGED FEE INDEX
	// =========================================================

	const changedFeeMap = getChangedFeeIndexes(currentInvoice.fee, formatFees);

	if (changedFeeMap.size > 0) {
		const changedFees = [];

		for (const [feeKey, { toIndex }] of changedFeeMap) {
			changedFees.push({
				feeKey,
				roomId: currentInvoice.room,
				lastIndex: toIndex,
			});
		}

		await Services.fees.setFeesIndexValue(changedFees);

		const feeIndexRecordsGenerated = await createFeeIndexRecordsFromChangedFees({
			changedFeeMap,
			editorId: userId,
			roomId: currentInvoice.room,
			fromSource: UPDATE_FEE_INDEX_SOURCE['MODIFY_INVOICE'],
		});

		console.log('feeIndexRecordsGenerated', feeIndexRecordsGenerated);
	}

	const modifedInvoice = await Services.invoices.modifyInvoice({
		total: newTotalInvoice,
		fee: formatFees,
		status: invoiceStatus,
		stayDays: stayDays,
		invoiceId: invoiceId,
		version: version,
	});

	return modifedInvoice;
};

exports.getInvoiceDetail = async (invoiceId, buildingId) => {
	const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);

	const invoice = await Services.invoices.getInvoiceDetail(invoiceObjectId);
	const { transactions, ...invoiceInfo } = invoice;
	const bankAccount = await Services.bankAccounts.findByBuildingId(buildingId).populate('bank').lean().exec();
	if (!bankAccount) throw new NotFoundError('Không tìm thấy tài khoản ngân hàng của tòa nhà !');

	return {
		invoiceDetail: { transactionInfo: transactions, ...invoiceInfo },
		paymentInfo: {
			_id: bankAccount._id,
			accountNumber: bankAccount.accountNumber,
			accountName: bankAccount.accountName,
			bank: bankAccount.bank,
		},
	};
};

// Cần check case hóa đơn đang có transaction chưa được xác thực
exports.deleteInvoice = async (invoiceId, userId, invoiceVersion) => {
	const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);

	const invoice = await Services.invoices.findById(invoiceObjectId).lean().exec();
	if (!invoice) throw new NotFoundError('Hóa đơn không tồn tại');
	if (invoice.invoiceType === invoiceType['FIRST_INVOICE']) throw new BadRequestError('Không thể xóa hóa đơn tháng đầu tiên !');

	await Services.rooms.assertRoomWritable({ roomId: invoice.room, userId });
	await Services.invoices.terminateInvoice({ invoiceId: invoiceId, version: invoiceVersion });

	const { fee } = invoice;

	// =========================================================
	// ROLLBACK FEE INDEX
	// =========================================================

	const feeIndexes = (invoice.fee ?? []).filter((fee) => fee.unit === feeUnit['INDEX']);

	if (feeIndexes.length > 0) {
		const feeKeys = feeIndexes.map((fee) => fee.feeKey);

		// Lấy Fee hiện tại trước khi rollback
		const currentFees = await Services.fees.findByRoomIdAndFeeKey(invoice.room, feeKeys);

		const rollbackFeeMap = getFeeIndexesForRollback(invoice.feeIndexSnapshot, currentFees);

		if (rollbackFeeMap.size > 0) {
			const updateFeeIndexValueData = [];

			for (const [feeKey, { toIndex }] of rollbackFeeMap) {
				updateFeeIndexValueData.push({
					feeKey,
					roomId: invoice.room,
					lastIndex: toIndex,
				});
			}

			await Services.fees.setFeesIndexValue(updateFeeIndexValueData);

			await createFeeIndexRecordsFromChangedFees({
				changedFeeMap: rollbackFeeMap,
				editorId: userId,
				roomId: invoice.room,
				fromSource: UPDATE_FEE_INDEX_SOURCE['TERMINATE_INVOICE'],
			});
		}
	}

	if (invoice.debts?.length > 0) {
		await Services.debts.rollBackDebtsBySourceIds(invoiceObjectId, debtStatus['PENDING']);
	}

	await Services.rooms.bumpRoomVersionBlind(invoice.room);

	throw new InternalError('Stop for testing ');

	return 'Success';
};

exports.checkout = async (data) => {
	const { invoiceId, buildingId, date, amount, collectorInfo, version, idempotencyKey, paymentMethod } = data;

	const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);
	const collectorObjectId = new mongoose.Types.ObjectId(collectorInfo._id);

	const currentInvoice = await Services.invoices.findById(invoiceObjectId).lean().exec();
	if (!currentInvoice) throw new NotFoundError('Hóa đơn không tồn tại');
	if (currentInvoice.status === invoiceStatus['PAID']) throw new BadRequestError('Hóa đơn này đã được thanh toán, vui lòng tải lại trang');
	if (currentInvoice.version !== version) throw new ConflictError('Hóa đơn này được cập nhật, vui lòng tải lại trang !');

	await Services.rooms.assertRoomWritable({ roomId: currentInvoice.room, userId: collectorInfo._id });

	const currentPeriod = await getCurrentPeriod(buildingId);

	let createTransaction;
	if (paymentMethod === PAYMENT_METHOD['CASH']) {
		createTransaction = await Services.transactions.createCashTransaction({
			amount: amount,
			date: date,
			type: billType['INVOICE'],
			collectorId: collectorObjectId,
			id: invoiceObjectId,
			currentPeriod,
			idempotencyKey,
			createdBy: collectorInfo.role,
		});

		//=========== NOTIFICATION ==========//
		if (collectorInfo.role !== Roles['OWNER']) {
			await notificationJob({
				collectorId: collectorObjectId,
				invoiceId: invoiceId.toString(),
				amount: amount,
				notiType: NOTI_MANAGER_COLLECT_CASH_INVOICE,
			});
		}
	} else {
		createTransaction = await Services.transactions.generateTransferTransactionByManagement({
			amount: amount,
			idempotencyKey,
			collector: collectorObjectId,
			createdBy: collectorInfo.role,
			date,
			invoice: invoiceObjectId,
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
		});
	}

	const unpaidAmount = calculateInvoiceUnpaidAmount(currentInvoice.total, currentInvoice.paidAmount);
	const appliedAmount = Math.min(createTransaction.amount, unpaidAmount);

	const updatedTotalPaid = currentInvoice.paidAmount + createTransaction.amount;
	const newInvoiceStatus = getInvoiceStatus(updatedTotalPaid, currentInvoice.total);
	await Services.invoices.updateInvoicePaidStatusWithVersion({ invoiceId, paidAmount: updatedTotalPaid, invoiceStatus: newInvoiceStatus, version });

	if (!!currentInvoice.detuctedInfo) {
		const { detuctedType } = currentInvoice.detuctedInfo;
		if (detuctedType === DETUCTED_TYPE['DEPOSIT_REFUND']) {
			const depositRefundInfo = await Services.depositRefunds.findByInvoiceUnpaidId(invoiceObjectId);
			if (!depositRefundInfo) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');

			depositRefundInfo.depositRefundAmount += appliedAmount;
			if (newInvoiceStatus === invoiceStatus['PAID']) {
				depositRefundInfo.invoiceUnpaid = null;
				await Services.invoices.removeDetuctedInfo(invoiceObjectId);
			}
			depositRefundInfo.version += 1;
			await depositRefundInfo.save();
		}
		if (detuctedType === DETUCTED_TYPE['TERMINATE_CONTRACT_EARLY']) {
			const checkoutCost = await Services.checkoutCosts.findByInvoiceId(invoiceObjectId);
			if (!checkoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại');

			checkoutCost.total -= appliedAmount;
			if (newInvoiceStatus === invoiceStatus['PAID']) {
				checkoutCost.invoicesUnpaid = null;
				await Services.invoices.removeDetuctedInfo(invoiceObjectId);
			}
			checkoutCost.version += 1;
			await checkoutCost.save();
		}
	}

	return {
		transactionId: createTransaction.transactionId,
	};
};

exports.createInvoice = async (roomId, buildingId, stayDays, feeIndexValues, createrId, roomVersion) => {
	const roomObjectId = new mongoose.Types.ObjectId(roomId);
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	const paymentInfo = await Services.bankAccounts.findByBuildingId(buildingId).lean().exec();
	if (!paymentInfo) throw new BadRequestError('Tòa nhà chưa có thông tin thanh toán !');

	await Services.rooms.assertRoomWritable({ roomId, userId: createrId });
	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const roomContractOwner = await Services.customers
		.findIsContractOwnerByRoomId(roomObjectId)

		.populate('contract')
		.lean()
		.exec();
	if (!roomContractOwner || !roomContractOwner.contract) throw new NotFoundError(`Phòng không tồn tại chủ hợp đồng !`);

	const roomFees = await Services.fees.getRoomFeesAndDebts(roomObjectId);
	const formatRoomFees = generateInvoiceFees(roomFees.feeInfo, roomFees._id.rent, stayDays, feeIndexValues, true, 'create');
	const totalRoomfees = calculateTotalFeeAmount(formatRoomFees);

	const feeIndexSnapshot = formatFeeIndexRecords(formatRoomFees);
	console.log('log of feeIndexSnapshot: ', feeIndexSnapshot);

	let debts = await Services.debts.getDebts(roomObjectId);
	if (debts?.length > 0) debts = formatDebts(debts);
	else debts = null;

	const totalInvoiceAmount = totalRoomfees + (debts?.amount ?? 0);
	const createdInvoice = await Services.invoices.createInvoice({
		roomId: roomObjectId,
		listFees: formatRoomFees,
		totalInvoiceAmount,
		stayDays,
		debtInfo: debts,
		currentPeriod,
		payerName: roomContractOwner.fullName,
		creater: createrId,
		contract: roomContractOwner.contract._id,
		feeIndexSnapshot: feeIndexSnapshot,
	});

	if (Array.isArray(debts) && debts.length > 0) {
		await Services.debts.closeAndSetSourceInfo({
			contractId: roomContractOwner.contract._id,
			sourceId: createdInvoice._id,
			sourceType: sourceType['INVOICE'],
		});
	}

	const changedFeeMap = getChangedFeeIndexes(roomFees.feeInfo, formatRoomFees);
	if (changedFeeMap.size > 0) {
		const changedFees = [];

		for (const [feeKey, { toIndex }] of changedFeeMap) {
			changedFees.push({
				feeKey,
				roomId: roomId,
				lastIndex: toIndex,
			});
		}

		await Services.fees.setFeesIndexValue(changedFees);

		const feeIndexRecordsGenerated = await createFeeIndexRecordsFromChangedFees({
			changedFeeMap,
			editorId: createrId,
			roomId: roomId,
			fromSource: UPDATE_FEE_INDEX_SOURCE['CREATE_INVOICE'],
		});

		console.log('log of feeIndexRecordsGenerated: ', feeIndexRecordsGenerated);
	}

	await Services.rooms.unLockedRoom(roomId);

	await znsNewInvoiceNotiJob({ billId: createdInvoice._id, type: billType.INVOICE });

	return createdInvoice;
};

exports.deleteDebts = async (invoiceId, version) => {
	const invoiceInfo = await Services.invoices.findById(invoiceId).lean().exec();
	if (!invoiceInfo) throw new NotFoundError('Hóa đơn không tồn tại');
	if (invoiceInfo.version !== version) throw new ConflictError('Dữ liệu đã bị thay đổi! Vui lòng tải lại trang.');

	const totalDebts = invoiceInfo.debts.reduce((sum, debt) => sum + debt.amount, 0);

	const newInvoiceStatus = getInvoiceStatus(invoiceInfo.paidAmount, invoiceInfo.total - totalDebts);
	const calculateInvoiceTotal = invoiceInfo.total - totalDebts;

	const invoiceUpdated = await Services.invoices.removeDebtsFromInvoice({
		invoiceId: invoiceId,
		version,
		invoiceStatus: newInvoiceStatus,
		invoiceTotal: calculateInvoiceTotal,
	});
	return invoiceUpdated;
};
