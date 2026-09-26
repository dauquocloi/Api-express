const mongoose = require('mongoose');
const Services = require('../service');
const { NotFoundError, ConflictError, BadRequestError, InternalError } = require('../AppError');
const { formatDebts } = require('../service/debts.helper');
const { generateInvoiceFees } = require('../service/invoices.helper');
const { validateFeeIndexMatch } = require('../service/fees.helper');
const {
	sourceType,
	CHECKOUT_TYPES,
	DETUCTED_TYPE,
	receiptStatus,
	receiptTypes,
	feeUnit,
	debtStatus,
	UPDATE_FEE_INDEX_SOURCE,
	getDebtsReceiptsUnpaidUsedFor,
} = require('../constants');
const Roles = require('../constants/userRoles');
// const { LockInvoiceJob } = require('../jobs/Invoices');
const { lockInvoiceJob } = require('../jobs/invoice/invoice.job');
const { lockReceiptJob } = require('../jobs/receipt/receipt.job');
const { calculateTotalCheckoutCostAmount } = require('../service/checkoutCost/checkoutCosts.helper');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { checkExistPendingTransactions } = require('./depositRefunds.util');
const { getChangedFeeIndexes, createFeeIndexRecordsFromChangedFees } = require('../service/fees.helper');

exports.getCheckoutCostDetail = async (checkoutCostId, buildingId) => {
	const checkoutCostObjectId = new mongoose.Types.ObjectId(checkoutCostId);

	const result = await Services.checkoutCosts.getCheckoutCostDetail(checkoutCostObjectId);

	const bankAccount = await Services.bankAccounts.findByBuildingId(buildingId).populate('bank').lean().exec();
	if (!bankAccount) throw new NotFoundError('Không tìm thấy tài khoản ngân hàng của tòa nhà !');

	return {
		...result,
		paymentInfo: {
			_id: bankAccount._id,
			accountNumber: bankAccount.accountNumber,
			accountName: bankAccount.accountName,
			bank: bankAccount.bank,
		},
	};
};

exports.getModifyCheckoutCostInfo = async (checkoutCostId) => {
	const checkoutCostObjectId = new mongoose.Types.ObjectId(checkoutCostId);
	const checkoutCost = await Services.checkoutCosts.getCheckoutCostDetail(checkoutCostObjectId);

	if (Array.isArray(checkoutCost.invoicesUnpaid) && checkoutCost.invoicesUnpaid.length > 0) {
		// Should use bulk write
		const invoiceIds = [];
		for (const invoice of checkoutCost.invoicesUnpaid) {
			invoiceIds.push(invoice._id);
			await lockInvoiceJob(
				{ invoiceId: invoice._id },
				{
					delay: 10 * 60 * 1000,
				},
			);
		}

		await Services.invoices.unlockInvoices(invoiceIds);
	}
	if (Array.isArray(checkoutCost.receiptsUnpaid) && checkoutCost?.receiptsUnpaid?.length > 0) {
		await Services.receipts.unlockManyReceipts(checkoutCost.receiptsUnpaid.map((r) => r._id));

		await lockReceiptJob(
			{ receiptIds: checkoutCost.receiptsUnpaid.map((r) => r._id.toString()) },
			{
				delay: 10 * 60 * 1000,
			},
		);
	}
	return checkoutCost;
};

exports.finishModifyCheckoutCost = async (checkoutCostId) => {
	let session;
	try {
		session = await mongoose.startSession();
		return await session.withTransaction(async () => {
			const currentCheckoutCost = await Services.checkoutCosts.findById(checkoutCostId).session(session).lean().exec();
			if (!currentCheckoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại !');

			if (currentCheckoutCost.invoicesUnpaid?.length > 0) {
				// await Services.invoices.lockInvoice(currentCheckoutCost.invoiceUnpaid, session);
				await Services.invoices.lockInvoiceByIds(currentCheckoutCost.invoicesUnpaid, session);
			}
			if (currentCheckoutCost.receiptsUnpaid?.length > 0) {
				await Services.receipts.lockReceipts(currentCheckoutCost.receiptsUnpaid, session);
			}

			return true;
		});
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.removeDebtsFromCheckoutCost = async (checkoutCostId) => {
	const currentCheckOutCost = await Services.checkoutCosts.findById(checkoutCostId);
	if (currentCheckOutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại !');
	if (!currentCheckOutCost.debts || currentCheckOutCost.debts.length === 0) throw new NotFoundError('khoản nợ không tồn tại !');

	const debts = await Services.debts.getDebtsByIds(currentCheckOutCost.debts).lean().exec();
	if (!debts || debts.length === 0) throw new NotFoundError('Dữ liệu không tồn tại');

	const totalDebts = formatDebts(debts).amount;
	await Services.debts.updateDebtsStatus(currentCheckOutCost.debts, debtStatus['TERMINATED']);

	const newCheckoutCostTotal = currentCheckOutCost.total - totalDebts;
	currentCheckOutCost.total = newCheckoutCostTotal;
	currentCheckOutCost.debts = [];
	currentCheckOutCost.version += 1;

	await currentCheckOutCost.save();
	return currentCheckOutCost;
};

exports.modifyCheckoutCost = async (data) => {
	const { checkoutCostId, version, feeIndexValues, stayDays, feesOther, userId } = data;
	const currentCheckoutCost = await Services.checkoutCosts
		.findById(checkoutCostId)
		.populate('checkoutCostReceipt receiptsUnpaid invoicesUnpaid debts contractId');

	console.log('log of currentCheckoutCost: ', currentCheckoutCost);
	if (version !== currentCheckoutCost.version) throw new ConflictError(`Dữ liệu này đã bị thay đổi`);

	const {
		fees,
		feesOther: oldFeesOther,
		invoicesUnpaid,
		total,
		checkoutCostReceipt,
		receiptsUnpaid,
		debts,
		contractId: contract,
	} = currentCheckoutCost;

	let currentFeeIndexIds = fees.map((f) => (f.unit === feeUnit['INDEX'] ? f._id.toString() : null)).filter(Boolean);
	if (currentFeeIndexIds.length > 0) validateFeeIndexMatch(currentFeeIndexIds, feeIndexValues);

	const lastestContractVersion = contract.versions?.length ? contract.versions.reduce((max, v) => (v.version > max.version ? v : max)) : null;

	let formatRoomFees;
	if (!invoicesUnpaid || invoicesUnpaid.length === 0) {
		formatRoomFees = generateInvoiceFees(fees, lastestContractVersion?.rent, stayDays, feeIndexValues, true, 'modify');
	} else {
		formatRoomFees = generateInvoiceFees(fees, 0, 0, feeIndexValues, false, 'modify');
	}

	const newTotalCheckoutCost = calculateTotalCheckoutCostAmount(formatRoomFees, debts, receiptsUnpaid, invoicesUnpaid, feesOther);

	if (!checkoutCostReceipt) {
		if (newTotalCheckoutCost > 0) {
			const contractOwner = await Services.customers.findOwnerByContractId(contract._id).lean().exec();
			const currentPeriod = await getCurrentPeriod(currentCheckoutCost.buildingId);
			const checkoutCostReceiptCreated = await Services.receipts.createReceipt({
				roomObjectId: currentCheckoutCost.roomId,
				receiptAmount: newTotalCheckoutCost,
				payer: contractOwner?.fullName ?? 'Chủ hợp đồng',
				currentPeriod,
				receiptContent: 'Chi phí trả phòng',
				receiptType: receiptTypes['CHECKOUT'],
				initialStatus: receiptStatus['UNPAID'],
				date: new Date(),
				contract: contract._id,
				creater: userId,
			});
			currentCheckoutCost.checkoutCostReceipt = checkoutCostReceiptCreated._id;
		}
	} else {
		await Services.receipts.modifyReceipt({
			receiptObjectId: checkoutCostReceipt._id,
			receiptAmount: newTotalCheckoutCost,
			receiptContent: checkoutCostReceipt.receiptContent,
			receiptVersion: checkoutCostReceipt.version,
		});
	}

	const changedFeeMap = getChangedFeeIndexes(fees, formatRoomFees);
	if (changedFeeMap.size > 0) {
		const changedFees = [];

		for (const [feeKey, { toIndex }] of changedFeeMap) {
			changedFees.push({
				feeKey,
				roomId: currentCheckoutCost.roomId,
				lastIndex: toIndex,
			});
		}

		await Services.fees.setFeesIndexValue(changedFees);

		const feeIndexRecordsGenerated = await createFeeIndexRecordsFromChangedFees({
			changedFeeMap,
			editorId: userId,
			roomId: currentCheckoutCost.roomId,
			fromSource: UPDATE_FEE_INDEX_SOURCE['CHECKOUT_COST'],
		});

		console.log('feeIndexRecordsGenerated', feeIndexRecordsGenerated);
	}

	await Services.checkoutCosts.modifyCheckoutCost({
		checkoutCostId,
		fees: formatRoomFees,
		feesOther,
		newTotal: newTotalCheckoutCost,
		stayDays,
		version,
	});

	throw new BadRequestError('Stop for testing');
	return 'Success';
};

// should not be used
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

			const { checkoutCostReceipt, receiptsUnpaid, invoicesUnpaid, fees } = currentCheckoutCost;
			if (checkoutCostReceipt.status === receiptStatus['PAID'] || checkoutCostReceipt.status === receiptStatus['PARTIAL']) {
				throw new BadRequestError('Không thể xóa phiếu đã thanh toán');
			}
			if (Array.isArray(invoicesUnpaid) && invoicesUnpaid.length > 0) {
				await Services.invoices.rollBackInvoicesAtCheckoutCost(invoicesUnpaid, session);
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

//should Generate incidental revenue deposit receipt amount
exports.generateCheckoutCost = async (data) => {
	const { roomId, contractId, feeIndexValues, feesOther, stayDays, roomVersion, userId } = data;
	const roomObjectId = new mongoose.Types.ObjectId(roomId);
	const currentRoom = await Services.rooms.assertRoomWritable({ roomId, userId });
	const currentPeriod = await getCurrentPeriod(currentRoom.building);

	const contractOwner = await Services.customers.findIsContractOwnerByRoomId(roomObjectId).lean().exec();
	if (!contractOwner) throw new NotFoundError(`Phòng không tồn tại chủ hợp đồng !`);

	const debtsAndReceiptUnpaid = await Services.contracts.getDebtsAndReceiptsUnpaid(
		contractId,
		getDebtsReceiptsUnpaidUsedFor['TERMINATE_CONTRACT_EARLY'],
	);
	const { fees, depositReceipt, invoicesUnpaid = [], receiptsUnpaid = [], debts = [], contract } = debtsAndReceiptUnpaid;
	checkExistPendingTransactions(receiptsUnpaid, invoicesUnpaid);

	const roomFeeIndex = fees.filter((f) => f.unit === feeUnit['INDEX']);
	const roomFeeIndexIds = roomFeeIndex.map((fee) => fee._id.toString()) || [];

	if (roomFeeIndexIds.length > 0) validateFeeIndexMatch(roomFeeIndexIds, feeIndexValues);

	let formatRoomFees;
	if (invoicesUnpaid.length > 0) {
		formatRoomFees = generateInvoiceFees(roomFeeIndex, 0, 0, feeIndexValues, false);
	} else {
		formatRoomFees = generateInvoiceFees(fees, contract.rent, stayDays, feeIndexValues, true);
	}
	console.log('log of formatRoomFees: ', formatRoomFees);
	const totalCost = calculateTotalCheckoutCostAmount(formatRoomFees, debts, receiptsUnpaid, invoicesUnpaid, feesOther);
	console.log('log of totalCost: ', totalCost);

	let checkoutCostReceipt = null;
	if (totalCost > 0) {
		checkoutCostReceipt = await Services.receipts.createReceipt({
			roomObjectId: roomObjectId,
			receiptAmount: totalCost,
			payer: contractOwner.fullName,
			currentPeriod: currentPeriod,
			receiptContent: 'Chi phí trả phòng',

			receiptType: receiptTypes['CHECKOUT'],
			initialStatus: receiptStatus['UNPAID'],
			contract: contractId,
			creater: userId,
		});
	}

	const closeDepositReceipt = await Services.receipts.closeReceiptDeposit({ receiptId: depositReceipt._id });

	const newCheckoutCost = await Services.checkoutCosts.generateCheckoutCost({
		roomId: roomId,
		contractId: contractId,
		buildingId: currentRoom.building,
		creatorId: userId,

		customerName: contractOwner.fullName,
		receiptsUnpaid: receiptsUnpaid,
		invoicesUnpaid: invoicesUnpaid,
		debts: debts,
		roomFees: formatRoomFees,
		currentPeriod: currentPeriod,
		checkoutCostReceipt: checkoutCostReceipt,
		totalCost: totalCost,
		feesOther: feesOther,
		stayDays: stayDays,
	});

	console.log('Log of newCheckoutCost: ', newCheckoutCost);

	const building = await Services.buildings.findById(currentRoom.building).lean().exec();

	if (building.includeDepositRevenue === false) {
		const ownerInfo = building.management.find((m) => m.role === Roles['OWNER']);

		const incidentalRevenue = await Services.revenues.createIncidentalRevenue({
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
			buildingId: currentRoom.building,
			amount: closeDepositReceipt.paidAmount,
			content: `Khoản bỏ cọc của phòng ${currentRoom.roomIndex}`,
			collector: ownerInfo._id,
			date: Date.now(),
		});
		console.log('incidentalRevenue: ', incidentalRevenue);
	}

	if (Array.isArray(newCheckoutCost.debts) && newCheckoutCost.debts?.length > 0) {
		await Services.debts.closeAndSetSourceInfo({
			contractId: contractId,
			sourceId: newCheckoutCost._id,
			sourceType: sourceType['CHECKOUT_COST'],
		});
	}
	if (newCheckoutCost.invoicesUnpaid?.length > 0) {
		await Services.invoices.closeAndSetDetuctedInvoice({
			invoiceIds: newCheckoutCost.invoicesUnpaid,
			detuctedType: DETUCTED_TYPE['TERMINATE_CONTRACT_EARLY'],
			detuctedId: newCheckoutCost._id,
		});
	}
	if (newCheckoutCost.receiptsUnpaid?.length > 0) {
		await Services.receipts.closeAndSetDetucted(newCheckoutCost.receiptsUnpaid, DETUCTED_TYPE['TERMINATE_CONTRACT_EARLY'], newCheckoutCost._id);
	}

	const changedFeeMap = getChangedFeeIndexes(fees, formatRoomFees);
	console.log('Log of changedFeeMap: ', changedFeeMap);
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
			editorId: userId,
			roomId: roomId,
			fromSource: UPDATE_FEE_INDEX_SOURCE['CHECKOUT_COST'],
		});

		console.log('feeIndexRecordsGenerated', feeIndexRecordsGenerated);
	}

	await Services.rooms.generateRoomHistory({
		roomId: roomId,
		contractId: contractId,
		contractCode: contract.contractCode,
		contractSignDate: contract.contractSignDate,
		contractEndDate: contract.contractEndDate,
		depositAmount: depositReceipt.paidAmount,
		checkoutDate: Date.now(),
		checkoutType: CHECKOUT_TYPES['CHECKOUT_EARLY'],
		checkoutCostId: newCheckoutCost._id,
		depositRefundId: null,
		interiors: currentRoom.interior,
		fees: fees,
		rent: contract.rent,
	});
	await Services.rooms.completeChangeRoomState({ roomId, roomVersion });
	await Services.customers.expiredCustomers({ roomId: roomObjectId, contractId: contractId });
	await Services.contracts.expiredContract(contractId);

	throw new InternalError('Stop for testing');

	return newCheckoutCost;
};
