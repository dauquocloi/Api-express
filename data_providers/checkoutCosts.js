const mongoose = require('mongoose');
const Services = require('../service');
const { NotFoundError, ConflictError, BadRequestError } = require('../AppError');
const { formatDebts } = require('../service/debts.helper');
const { generateInvoiceFees } = require('../service/invoices.helper');
const { calculateTotalFeeAmount, calculateTotalFeesOther } = require('../utils/calculateFeeTotal');
const { feeUnit } = require('../constants/fees');
const { validateFeeIndexMatch } = require('../service/fees.helper');
const { receiptStatus, receiptTypes } = require('../constants/receipt');
const { sourceType } = require('../constants/debts');
const { invoiceType } = require('../constants/invoices');
const { CHECKOUT_TYPES } = require('../constants/rooms');
// const { LockInvoiceJob } = require('../jobs/Invoices');
const { lockInvoiceJob } = require('../jobs/invoice/invoice.job');
const { lockReceiptJob } = require('../jobs/receipt/receipt.job');
const { calculateTotalCheckoutCostAmount } = require('../service/checkoutCost/checkoutCosts.helper');
const getCurrentPeriod = require('../utils/getCurrentPeriod');

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

exports.getModifyCheckoutCostInfo = async (checkoutCostId, userId) => {
	let session;
	try {
		session = await mongoose.startSession();
		return await session.withTransaction(async () => {
			const checkoutCostObjectId = new mongoose.Types.ObjectId(checkoutCostId);
			const checkoutCost = await Services.checkoutCosts.getCheckoutCostDetail(checkoutCostObjectId, session);

			if (checkoutCost.invoicesUnpaid && checkoutCost.invoicesUnpaid.length > 0) {
				for (const invoice of checkoutCost.invoicesUnpaid) {
					await Services.invoices.unLockInvoice(invoice._id, session, userId);

					await lockInvoiceJob(
						{ invoiceId: invoice._id },
						{
							delay: 10 * 60 * 1000,
						},
					);
				}
			}
			if (checkoutCost?.receiptsUnpaid && checkoutCost?.receiptsUnpaid?.length > 0) {
				await Services.receipts.unlockManyReceipts(
					checkoutCost.receiptsUnpaid.map((r) => r._id),
					session,
				);

				await lockReceiptJob(
					{ receiptIds: checkoutCost.receiptsUnpaid.map((r) => r._id.toString()) },
					{
						delay: 10 * 60 * 1000,
					},
				);
			}
			return checkoutCost;
		});
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.finishModifyCheckoutCost = async (checkoutCostId) => {
	let session;
	try {
		session = await mongoose.startSession();
		return await session.withTransaction(async () => {
			const currentCheckoutCost = await Services.checkoutCosts.findById(checkoutCostId).session(session).lean().exec();
			if (!currentCheckoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại !');

			if (currentCheckoutCost.invoiceUnpaid) {
				await Services.invoices.lockInvoice(currentCheckoutCost.invoiceUnpaid, session);
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
	let session;
	try {
		session = await mongoose.startSession();
		return await session.withTransaction(async () => {
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
			return currentCheckOutCost;
		});
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

// Chưa check nợ
// exports.modifyCheckoutCost = async (checkoutCostId, version, feeIndexValues, stayDays, feesOther, userId) => {
// 	let session;
// 	try {
// 		session = await mongoose.startSession();
// 		await session.withTransaction(async () => {
// 			const currentCheckoutCost = await Services.checkoutCosts.findById(checkoutCostId).session(session).populate('checkoutCostReceipt');
// 			if (version !== currentCheckoutCost.version) throw new ConflictError(`Dữ liệu này đã bị thay đổi`);

// 			const { fees, feesOther: oldFeesOther, invoicesUnpaid, total, checkoutCostReceipt } = currentCheckoutCost;
// 			let currentFeeIndexIds = fees.map((f) => (f.unit === feeUnit['INDEX'] ? f._id.toString() : null)).filter(Boolean);
// 			if (currentFeeIndexIds.length > 0) validateFeeIndexMatch(currentFeeIndexIds, feeIndexValues);

// 			let totalCurrentRoomFees = calculateTotalFeeAmount(fees);
// 			let totalCurrentOtherFees = calculateTotalFeesOther(oldFeesOther);

// 			let formatRoomFees;
// 			if (!invoicesUnpaid || invoicesUnpaid.length === 0) {
// 				formatRoomFees = generateInvoiceFees(fees, 0, stayDays, feeIndexValues, true, 'modify');
// 			} else {
// 				formatRoomFees = generateInvoiceFees(fees, 0, 0, feeIndexValues, false, 'modify');
// 			}
// 			const totalRoomFees = calculateTotalFeeAmount(formatRoomFees);
// 			const totalOtherFees = calculateTotalFeesOther(feesOther);

// 			const currentCheckoutCostTotalWithoutRoomFeesAndDebts = total - (totalCurrentRoomFees + totalCurrentOtherFees);
// 			const newCheckoutCostTotal = currentCheckoutCostTotalWithoutRoomFeesAndDebts + totalRoomFees + totalOtherFees;
// 			console.log('log of newCheckoutCostTotal: ', newCheckoutCostTotal);

// 			await Services.receipts.modifyReceipt(
// 				{
// 					receiptObjectId: checkoutCostReceipt._id,
// 					receiptAmount: newCheckoutCostTotal,
// 					receiptContent: checkoutCostReceipt.receiptContent,
// 					receiptVersion: checkoutCostReceipt.version,
// 				},
// 				session,
// 			);
// 			await Services.checkoutCosts.modifyCheckoutCost(
// 				{ checkoutCostId, version, fees: formatRoomFees, feesOther, newTotal: newCheckoutCostTotal },
// 				session,
// 			);

// 			let currentFeeIndexKeys = fees.map((f) => (f.unit == feeUnit['INDEX'] ? f.feeKey : null)).filter(Boolean);
// 			let modifyFeeIndex = formatRoomFees.map((f) => (f.unit === feeUnit['INDEX'] ? f : null)).filter(Boolean);
// 			console.log('log of modifyFeeIndex: ', modifyFeeIndex);
// 			console.log('log of currentFeeIndexKeys: ', currentFeeIndexKeys);
// 			await Services.fees.updateFeeIndexValuesByFeeKey(currentFeeIndexKeys, currentCheckoutCost.roomId, modifyFeeIndex, session);

// 			return 'Success';
// 		});
// 		return 'Success';
// 	} catch (error) {
// 		throw error;
// 	} finally {
// 		if (session) session.endSession();
// 	}
// };

// modify checkout 0.2
exports.modifyCheckoutCost = async (checkoutCostId, version, feeIndexValues, stayDays, feesOther, userId) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentCheckoutCost = await Services.checkoutCosts
				.findById(checkoutCostId)
				.session(session)
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

			let formatRoomFees;
			if (!invoicesUnpaid || invoicesUnpaid.length === 0) {
				formatRoomFees = generateInvoiceFees(fees, contract?.rent, stayDays, feeIndexValues, true, 'modify');
			} else {
				formatRoomFees = generateInvoiceFees(fees, 0, 0, feeIndexValues, false, 'modify');
			}

			const newTotalCheckoutCost = calculateTotalCheckoutCostAmount(formatRoomFees, debts, receiptsUnpaid, invoicesUnpaid, feesOther);

			if (!checkoutCostReceipt) {
				if (newTotalCheckoutCost > 0) {
					const contractOwner = await Services.customers.findOwnerByContractId(contract._id).session(session).lean().exec();
					const currentPeriod = await getCurrentPeriod(currentCheckoutCost.buildingId);
					const checkoutCostReceiptCreated = await Services.receipts.createReceipt(
						{
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
						},
						session,
					);
					currentCheckoutCost.checkoutCostReceipt = checkoutCostReceiptCreated._id;
				}
			} else {
				await Services.receipts.modifyReceipt(
					{
						receiptObjectId: checkoutCostReceipt._id,
						receiptAmount: newTotalCheckoutCost,
						receiptContent: checkoutCostReceipt.receiptContent,
						receiptVersion: checkoutCostReceipt.version,
					},
					session,
				);
			}

			currentCheckoutCost.fees = formatRoomFees;
			currentCheckoutCost.feesOther = feesOther;
			currentCheckoutCost.total = newTotalCheckoutCost;
			currentCheckoutCost.stayDays = stayDays;
			currentCheckoutCost.version += 1;
			await currentCheckoutCost.save({ session });

			let currentFeeIndexKeys = fees.map((f) => (f.unit == feeUnit['INDEX'] ? f.feeKey : null)).filter(Boolean);
			let modifyFeeIndex = formatRoomFees.map((f) => (f.unit === feeUnit['INDEX'] ? f : null)).filter(Boolean);
			await Services.fees.updateFeeIndexValuesByFeeKey(currentFeeIndexKeys, currentCheckoutCost.roomId, modifyFeeIndex, session);

			throw new BadRequestError('Stop for testing');
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

exports.generateCheckoutCost = async ({ roomId, contractId, creatorId, feeIndexValues, feesOther, stayDays, roomVersion }) => {
	let session;

	try {
		session = await mongoose.startSession();
		return await session.withTransaction(async () => {
			const roomObjectId = new mongoose.Types.ObjectId(roomId);
			const currentRoom = await Services.rooms.assertRoomWritable({ roomId, userId: creatorId, session });
			const currentPeriod = await getCurrentPeriod(currentRoom.building);

			const contractOwner = await Services.customers.findIsContractOwnerByRoomId(roomObjectId).session(session).lean().exec();
			if (!contractOwner) throw new NotFoundError(`Phòng không tồn tại chủ hợp đồng !`);

			const debtsAndReceiptUnpaid = await Services.contracts.getDebtsAndReceiptsUnpaid(contractId, session);
			const { fees, depositReceipt, invoicesUnpaid = [], receiptsUnpaid = [], debts = [], contract } = debtsAndReceiptUnpaid;

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
				checkoutCostReceipt = await Services.receipts.createReceipt(
					{
						roomObjectId: roomObjectId,
						receiptAmount: totalCost,
						payer: contractOwner.fullName,
						currentPeriod: currentPeriod,
						receiptContent: 'Chi phí trả phòng',

						receiptType: receiptTypes['CHECKOUT'],
						initialStatus: receiptStatus['UNPAID'],
						contract: contractId,
						creater: creatorId,
					},

					session,
				);
			}

			await Services.receipts.closeReceiptDeposit({ receiptId: depositReceipt._id }, session);

			const newCheckoutCost = await Services.checkoutCosts.generateCheckoutCost(
				{
					roomId: roomId,
					contractId: contractId,
					buildingId: currentRoom.building,
					creatorId: creatorId,

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
				},
				session,
			);

			if (Array.isArray(newCheckoutCost.debts) && newCheckoutCost.debts?.length > 0) {
				await Services.debts.closeAndSetSourceInfo(
					{ contractId: contractId, sourceId: newCheckoutCost._id, sourceType: sourceType['CHECKOUT_COST'] },
					session,
				);
			}
			if (newCheckoutCost.invoicesUnpaid?.length > 0) {
				await Services.invoices.closeAndSetDetucedInvoice(
					{
						invoiceIds: newCheckoutCost.invoicesUnpaid,
						detuctedType: 'terminateContractEarly',
						detuctedId: newCheckoutCost._id,
					},
					session,
				);
			}
			if (newCheckoutCost.receiptsUnpaid?.length > 0) {
				await Services.receipts.closeAndSetDetucted(newCheckoutCost.receiptsUnpaid, 'terminateContractEarly', newCheckoutCost._id, session);
			}

			if (roomFeeIndexIds.length > 0) {
				await Services.fees.updateFeeIndexValues(roomFeeIndexIds, feeIndexValues, session);
			}
			await Services.rooms.generateRoomHistory(
				{
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
				},
				session,
			);
			// await Services.rooms.bumpRoomVersion(roomObjectId, roomVersion, session);
			// await Services.rooms.unLockedRoom(roomObjectId, session);
			await Services.rooms.completeChangeRoomState({ roomId, roomVersion }, session);
			await Services.customers.expiredCustomers({ roomId: roomObjectId, contractId: contractId }, session);
			await Services.contracts.expiredContract(contractId, session);

			return newCheckoutCost;
		});
	} finally {
		if (session) session.endSession();
	}
};
