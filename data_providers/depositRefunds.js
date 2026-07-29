const { AppError, InvalidInputError, NotFoundError, BadRequestError, NoDataError, ConflictError, InternalError } = require('../AppError');
const Entity = require('../models');
const mongoose = require('mongoose');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const Pipelines = require('../service/aggregates');
const Services = require('../service');
const { client: redis } = require('../config').redisDb;
const { calculateTotalDebts } = require('../service/debts.helper');
const { calculateTotalReceipts } = require('../service/receipts.helper');
const { generateInvoiceFees } = require('../service/invoices.helper');
const { calculateTotalFeeAmount, calculateTotalFeesOther, calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { calculateDepositRefundAmount } = require('../service/depositRefunds.helper');
const { validateFeeIndexMatch } = require('../service/fees.helper');
// const { receiptTypes, receiptStatus } = require('../constants/receipt');
// const { invoiceStatus } = require('../constants/invoices');
// const { feeUnit } = require('../constants/fees');
// const { debtStatus } = require('../constants/debts');
const { receiptTypes, receiptStatus, invoiceStatus, feeUnit, debtStatus, CHECKOUT_TYPES } = require('../constants');
const { formatDebts } = require('../service/debts.helper');

exports.getDepositRefunds = async (buildingId, mode) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	let checkBuilding = await Entity.BuildingsEntity.exists({ _id: buildingObjectId });
	if (!checkBuilding) throw new InvalidInputError('Dữ liệu đầu vào không hợp lệ');

	// let depositRefundData = [];
	// if (mode === 'pending') {
	// 	depositRefundData = await Entity.DepositRefundsEntity.aggregate(
	// 		Pipelines.depositRefunds.getDepositRefundsModePendingPipeline(buildingObjectId),
	// 	);
	// } else {
	// 	depositRefundData = await Entity.DepositRefundsEntity.aggregate(
	// 		Pipelines.depositRefunds.getDepositRefundsModeRefundedPipeline(buildingObjectId),
	// 	);
	// }

	const result = await Services.depositRefunds.getDepositRefunds(buildingObjectId, mode);

	return result;
};

exports.getDepositRefundDetail = async (depositRefundId) => {
	const depositRefundObjectId = new mongoose.Types.ObjectId(depositRefundId);
	const [depositRefund] = await Entity.DepositRefundsEntity.aggregate(
		Pipelines.depositRefunds.getDepositRefundDetailPipeline(depositRefundObjectId),
	);
	if (!depositRefund) throw new NotFoundError('Không có dữ liệu');
	return depositRefund;
};

exports.getModifyDepositRefundInfo = async (depositRefundId) => {
	const depositRefundObjectId = new mongoose.Types.ObjectId(depositRefundId);
	const [depositRefund] = await Entity.DepositRefundsEntity.aggregate(
		Pipelines.depositRefunds.getDepositRefundDetailPipeline(depositRefundObjectId),
	);
	if (!depositRefund) throw new NotFoundError('Không có dữ liệu');
	if (depositRefund.invoiceUnpaid !== null && depositRefund.invoiceUnpaid) await Services.invoices.unLockInvoice(depositRefund.invoiceUnpaid._id);
	if (depositRefund.receiptsUnpaid && depositRefund.receiptsUnpaid.length > 0)
		await Services.receipts.unlockManyReceipts(depositRefund.receiptsUnpaid.map((receipt) => receipt._id));
	return depositRefund;
};

exports.confirmDepositRefund = async (depositRefundId, spenderId, redisKey) => {
	let session;
	try {
		const depositRefundObjectId = new mongoose.Types.ObjectId(depositRefundId);
		const spenderObjectId = new mongoose.Types.ObjectId(spenderId);

		session = await mongoose.startSession();
		session.startTransaction();

		const currentDepositRefund = await Entity.DepositRefundsEntity.findOne({ _id: depositRefundObjectId }).session(session).exec();
		if (!currentDepositRefund) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');

		const { room, building, contract } = currentDepositRefund;
		const currentPeriod = await getCurrentPeriod(building);

		// Update Phòng, Hợp đồng,
		const updatedContract = await Entity.ContractsEntity.findOneAndUpdate({ _id: contract }, { $set: { status: 'expired' } }, { session });
		if (!updatedContract) throw new NotFoundError('Hợp đồng không tồn tại');

		const roomInfo = await Entity.RoomsEntity.findOne({ _id: room }).session(session).exec();
		if (!roomInfo) throw new NotFoundError('Phòng không tồn tại');
		if (roomInfo.roomState === 2 && roomInfo.isDeposited === false) {
			roomInfo.roomState = 0;
		}
		roomInfo.isRefundDeposit = false;
		await roomInfo.save({ session });

		if (currentDepositRefund.invoiceUnpaid) {
			await Entity.InvoicesEntity.findOneAndUpdate(
				{ _id: currentDepositRefund.invoiceUnpaid },
				{ $set: { isDepositDeducted: true }, locked: true },
				{ session },
			);
		}
		if (currentDepositRefund.receiptsUnpaid?.length > 0) {
			await Entity.ReceiptsEntity.updateMany(
				{ _id: { $in: currentDepositRefund.receiptsUnpaid } },
				{ $set: { isDepositDeducted: true }, locked: true },
				{ session },
			);
		}

		currentDepositRefund.status = 'paid';
		currentDepositRefund.month = currentPeriod.currentMonth;
		currentDepositRefund.year = currentPeriod.currentYear;
		//Chèn ảnh giao dịch chuyển khoản vào đây;
		await currentDepositRefund.save({ session });

		//Tạo expenditure hoàn cọc
		await Entity.ExpendituresEntity.create(
			[
				{
					month: currentPeriod.currentMonth,
					year: currentPeriod.currentYear,
					content: `Hoàn cọc phòng ${roomInfo.roomIndex}`,
					amount: currentDepositRefund.depositRefundAmount,
					type: 'incidental',
					building: building,
					spender: spenderObjectId, // Owner only
				},
			],
			{ session },
		);

		await session.commitTransaction();

		await redis.set(redisKey, `SUCCESS:${JSON.stringify({ depositRefundId })}`, 'EX', process.env.REDIS_EXP_SEC);
		return 'Success';
	} catch (error) {
		if (session) await session.abortTransaction();
		await redis.set(redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

// should be refactored
exports.generateDepositRefund = async ({ contractId, roomVersion, feeIndexValues, feesOther, userId, redisKey }) => {
	let session;
	let result;

	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const checkExistedDepositRefund = await Services.depositRefunds.getDepositRefundByContractId(contractId, session);
			if (checkExistedDepositRefund !== null) throw new BadRequestError('Phiếu hoàn cọc đã tồn tại');

			const currentContractInfo = await Services.contracts
				.findById(contractId)
				.session(session)
				.populate('room depositReceiptId customer')
				.lean()
				.exec();
			if (!currentContractInfo) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ');
			const { room: currentRoom, depositReceiptId: depositReceipt, customer, versions } = currentContractInfo;
			const lastestContractVersion = versions.reduce((max, v) => (v.version > max.version ? v : max));

			if (currentRoom.version !== roomVersion) throw new ConflictError(`Dữ liệu của phòng đã bị thay đổi !`);

			const currentPeriod = await getCurrentPeriod(currentRoom.building);

			let debts = await Entity.DebtsEntity.find({ room: currentRoom._id, status: debtStatus['PENDING'] }, { _id: 1, content: 1, amount: 1 })
				.session(session)
				.lean()
				.exec();

			let receiptsUnpaid = await Entity.ReceiptsEntity.find(
				{
					room: currentRoom._id,
					status: {
						$in: [receiptStatus[`UNPAID`], receiptStatus[`PARTIAL`]],
					},
					receiptType: { $nin: [receiptTypes[`DEPOSIT`], receiptTypes[`CHECKOUT`]] },
					locked: false,
				},
				{ _id: 1, amount: 1, paidAmount: 1 },
			)
				.session(session)
				.lean()
				.exec();

			let invoiceUnpaid = await Entity.InvoicesEntity.findOne(
				{ room: currentRoom._id, status: { $in: [invoiceStatus[`UNPAID`], invoiceStatus[`PARTIAL`]] }, locked: false },
				{ _id: 1, total: 1, paidAmount: 1 },
			)
				.session(session)
				.lean()
				.exec();
			let totalDebts = 0;
			let totalReceiptsUnpaid = 0;
			let totalInvoiceUnpaid = 0;

			if (debts.length > 0) {
				totalDebts = calculateTotalDebts(debts);
				// debts = debts.map((d) => d._id);
			}
			if (receiptsUnpaid.length > 0) {
				totalReceiptsUnpaid = calculateTotalReceipts(receiptsUnpaid);
				// receiptsUnpaid = receiptsUnpaid.map((r) => r._id);
			}
			if (invoiceUnpaid !== null) {
				totalInvoiceUnpaid = calculateInvoiceUnpaidAmount(invoiceUnpaid.total, invoiceUnpaid.paidAmount);
			}

			let roomFees = await Entity.FeesEntity.find({ room: currentRoom._id }).session(session).lean().exec();
			let roomFeeIndex = roomFees.filter((f) => f.unit === feeUnit['INDEX']);
			let feeIndexTotalAmount = 0;
			const formatRoomFeeIndex = generateInvoiceFees(roomFeeIndex, 0, 0, feeIndexValues, false);

			if (roomFeeIndex.length > 0) {
				const roomFeeIndexIds = roomFees.map((f) => f._id.toString());
				validateFeeIndexMatch(roomFeeIndexIds, feeIndexValues);

				feeIndexTotalAmount = calculateTotalFeeAmount(formatRoomFeeIndex);

				await Services.fees.updateFeeIndexValues(roomFeeIndexIds, feeIndexValues, session);
			}
			const totalFeesOther = calculateTotalFeesOther(feesOther);

			const depositRefundAmount = calculateDepositRefundAmount(
				depositReceipt.paidAmount,
				totalDebts,
				totalReceiptsUnpaid,
				totalInvoiceUnpaid,
				totalFeesOther,
				feeIndexTotalAmount,
			);
			console.log('log of depositRefundAmount: ', depositRefundAmount);

			const createdDepositRefund = await Services.depositRefunds.createDepositRefund(
				currentRoom._id,
				formatRoomFeeIndex,
				feesOther,
				depositRefundAmount,
				invoiceUnpaid?._id,
				currentRoom.building,
				contractId,
				depositReceipt._id,
				customer._id,
				debts,
				receiptsUnpaid,
				currentPeriod,
				userId,
				session,
			);

			await Services.receipts.closeAndSetDetucted([depositReceipt._id], 'depositRefund', createdDepositRefund._id, session);
			if (receiptsUnpaid.length > 0) {
				await Entity.ReceiptsEntity.updateMany(
					{
						room: currentRoom._id,
						contract: currentContractInfo._id,
						status: {
							$in: [receiptStatus[`UNPAID`], receiptStatus[`PARTIAL`]],
						},
						receiptType: { $in: [receiptTypes['INCIDENTAL'], receiptTypes['DEBTS']] },
						locked: false,
					},
					{
						$set: {
							isDepositing: true,
							detuctedInfo: {
								detuctedType: 'depositRefund',
								detuctedId: createdDepositRefund._id,
							},
							locked: true,
						},
						$inc: { version: 1 },
					},
					{ session },
				);
			}
			if (debts.length > 0) {
				await Entity.DebtsEntity.updateMany(
					{ room: currentRoom._id, status: debtStatus['PENDING'] },
					{
						$set: {
							status: 'closed',
							locked: true,
						},
						$inc: { version: 1 },
					},
					{ session },
				);
			}
			if (invoiceUnpaid !== null) {
				await Entity.InvoicesEntity.updateOne(
					{ _id: invoiceUnpaid._id },
					{
						$set: {
							isDepositing: true,
							locked: true,
							detuctedInfo: { detuctedType: 'depositRefund', detuctedId: createdDepositRefund._id },
						},
						$inc: { version: 1 },
					},
					{ session },
				);
			}

			await Services.customers.expiredCustomers({ roomId: currentRoom._id, contractId: currentContractInfo._id }, session);
			await Services.vehicles.expiredVehicles({ roomId: currentRoom._id, contractId: currentContractInfo._id }, session);
			await Services.rooms.generateRoomHistory(
				{
					roomId: currentContractInfo.room._id,
					contractId: currentContractInfo._id,
					contractCode: currentContractInfo.contractCode,
					contractSignDate: currentContractInfo.contractSignDate,
					contractEndDate: currentContractInfo.contractEndDate,
					depositAmount: depositReceipt.paidAmount,
					checkoutDate: Date.now(),
					checkoutType: CHECKOUT_TYPES['DEPOSIT_REFUND'],
					checkoutCostId: null,
					depositRefundId: createdDepositRefund._id,
					interiors: currentRoom.interior,
					fees: roomFees,
					rent: lastestContractVersion.rent,
				},
				session,
			);
			await Services.rooms.completeChangeRoomState({ roomId: currentRoom._id, roomVersion: roomVersion }, session);
			await Services.contracts.expiredContract(currentContractInfo._id, session);
			result = createdDepositRefund;
			return result;
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

exports.generateDepositRefund2 = async ({ contractId, roomVersion, feeIndexValues, feesOther, userId }) => {
	let session;
	try {
		session = await mongoose.startSession();
		return await session.withTransaction(async () => {
			const currentContract = await Services.contracts.findById(contractId).populate('room').session(session).lean().exec();
			if (!currentContract) throw new BadRequestError('Contract not found');

			const debtsReceiptsUnpaid = await Services.contracts.getDebtsAndReceiptsUnpaid(contractId, session);
			const { invoicesUnpaid, receiptsUnpaid, debts, contract, depositReceipt, fees, room } = debtsReceiptsUnpaid;
			const currentPeriod = await getCurrentPeriod(currentContract.room.building);

			const totalDebts = formatDebts(debts).amount;
			const totalReceiptsUnpaid = calculateTotalReceipts(receiptsUnpaid);
			const totalInvoiceUnpaid = invoicesUnpaid?.length
				? calculateInvoiceUnpaidAmount(invoicesUnpaid[0].amount, invoicesUnpaid[0].paidAmount)
				: 0;
			const totalFeesOther = calculateTotalFeesOther(feesOther);

			const roomFeeIndex = fees.filter((f) => f.unit === feeUnit['INDEX']);

			let feeIndexTotalAmount = 0;
			const formatRoomFeeIndex = generateInvoiceFees(roomFeeIndex, 0, 0, feeIndexValues, false);
			if (roomFeeIndex.length > 0) {
				const roomFeeIndexIds = roomFeeIndex.map((f) => f._id.toString());
				validateFeeIndexMatch(roomFeeIndexIds, feeIndexValues);

				feeIndexTotalAmount = calculateTotalFeeAmount(formatRoomFeeIndex);

				await Services.fees.updateFeeIndexValues(roomFeeIndexIds, feeIndexValues, session);
			}

			const depositRefundAmount = calculateDepositRefundAmount(
				depositReceipt.paidAmount,
				totalDebts,
				totalReceiptsUnpaid,
				totalInvoiceUnpaid,
				totalFeesOther,
				feeIndexTotalAmount,
			);

			const debtIds = debts.map((d) => d._id.toString());
			const receiptIds = receiptsUnpaid.map((r) => r._id.toString());
			const createdDepositRefund = await Services.depositRefunds.createDepositRefund(
				{
					roomId: room._id,
					fees: formatRoomFeeIndex,
					feesOther,
					depositRefundAmount,
					invoiceUnpaid: invoicesUnpaid?.length ? invoicesUnpaid[0]._id : null,
					buildingId: currentContract.room.building,
					contractId,
					depositReceiptId: depositReceipt._id,
					contractOwnerId: currentContract.customer,
					debtIds,
					receiptIds,
					currentPeriod,
					creatorId: userId,
				},

				session,
			);

			await Services.receipts.closeAndSetDetucted([depositReceipt._id], CHECKOUT_TYPES['DEPOSIT_REFUND'], createdDepositRefund._id, session);
			if (receiptsUnpaid.length) {
				await Services.receipts.closeAndSetDetucted(receiptIds, CHECKOUT_TYPES['DEPOSIT_REFUND'], createdDepositRefund._id, session);
			}
			if (debts.length) {
				await Services.debts.closeDebts(room._id, session);
			}
			if (invoicesUnpaid.length) {
				const invoiceIds = invoicesUnpaid.map((i) => i._id.toString());

				await Services.invoices.closeAndSetDetucedInvoice(
					{ invoiceIds: invoiceIds, detuctedType: CHECKOUT_TYPES['DEPOSIT_REFUND'], detuctedId: createdDepositRefund._id },
					session,
				);
			}

			await Services.customers.expiredCustomers({ roomId: room._id, contractId: contractId }, session);
			await Services.vehicles.expiredVehicles({ roomId: room._id, contractId: contractId }, session);
			await Services.rooms.generateRoomHistory(
				{
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
				},
				session,
			);
			await Services.rooms.completeChangeRoomState({ roomId: room._id, roomVersion: roomVersion }, session);
			await Services.contracts.expiredContract(contractId, session);

			console.log('Successfully: ', createdDepositRefund);
			throw new InternalError('Stop for testing');
			return createdDepositRefund;
		});
	} finally {
		if (session) session.endSession();
	}
};

// un tested
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
			await Services.debts.terminateDebts(currentDepositRefund.debts, session);

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
//======= UN REFACTED =======//
exports.modifyDepositRefund = async (data, redisKey) => {
	let session;
	try {
		const { feesOther = [], fees = [], depositRefundId } = data;
		const depositRefundObjectId = new mongoose.Types.ObjectId(depositRefundId);

		session = await mongoose.startSession();
		session.startTransaction();

		const currentDepositRefund = await Entity.DepositRefundsEntity.findOne({ _id: depositRefundObjectId }).session(session);
		if (!currentDepositRefund) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');

		// ---- Helper tính tiền ----
		const calcIndexFees = (list) =>
			(list ?? []).reduce((sum, fee) => {
				return sum + (fee.lastIndex - fee.firstIndex) * fee.feeAmount;
			}, 0);

		const calcOtherFees = (list) => (list ?? []).reduce((sum, fee) => sum + fee.amount, 0);

		// ---- 1. Tính tổng fee hiện tại ----
		const currentTotalFee = calcIndexFees(currentDepositRefund.feesIndex) + calcOtherFees(currentDepositRefund.feesOther);

		// ---- 2. Tính tổng fee mới ----
		const newTotalFee = calcIndexFees(fees) + calcOtherFees(feesOther);

		// ---- 3. Update số tiền hoàn cọc ----
		currentDepositRefund.depositRefundAmount = currentDepositRefund.depositRefundAmount + currentTotalFee - newTotalFee;

		// ---- 4. Update danh sách fee ----
		currentDepositRefund.feesIndex = fees;
		currentDepositRefund.feesOther = feesOther;

		await currentDepositRefund.save({ session });
		await session.commitTransaction();

		await redis.set(redisKey, `SUCCESS:${JSON.stringify({ depositRefundId: currentDepositRefund._id })}`, 'EX', process.env.REDIS_EXP_SEC);

		return currentDepositRefund;
	} catch (error) {
		if (session) await session.abortTransaction();
		await redis.set(redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		if (session) session.endSession();
	}
};
