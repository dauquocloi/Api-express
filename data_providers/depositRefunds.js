const { AppError, InvalidInputError, NotFoundError, BadRequestError, NoDataError, ConflictError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const Entity = require('../models');
const mongoose = require('mongoose');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const Pipelines = require('../service/aggregates');
const Services = require('../service');
const { calculateTotalDebts } = require('../service/debts.helper');
const { calculateTotalReceipts } = require('../service/receipts.helper');
const { calculateInvoiceUnapaidAmount } = require('../service/invoices.helper');
const { generateInvoiceFees } = require('../service/invoices.helper');
const { calculateTotalFeeAmount, calculateTotalFeesOther } = require('../utils/calculateFeeTotal');
const { calculateDepositRefundAmount } = require('../service/depositRefunds.helper');
const { receiptTypes, receiptStatus } = require('../constants/receipt');
const { invoiceStatus } = require('../constants/invoices');
const { validateFeeIndexMatch } = require('../service/fees.helper');
const { feeUnit } = require('../constants/fees');
const { debtStatus } = require('../constants/debts');

exports.getDepositRefunds = async (buildingId, mode) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	let checkBuilding = await Entity.BuildingsEntity.exists({ _id: buildingObjectId });
	if (!checkBuilding) throw new InvalidInputError('Dữ liệu đầu vào không hợp lệ');

	let depositRefundData = [];
	if (mode === 'pending') {
		depositRefundData = await Entity.DepositRefundsEntity.aggregate(
			Pipelines.depositRefunds.getDepositRefundsModePendingPipeline(buildingObjectId),
		);
	} else {
		depositRefundData = await Entity.DepositRefundsEntity.aggregate(
			Pipelines.depositRefunds.getDepositRefundsModeRefundedPipeline(buildingObjectId),
		);
	}

	return depositRefundData;
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

exports.confirmDepositRefund = async (depositRefundId, spenderId) => {
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
		return 'Success';
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.generateDepositRefund = async ({ contractId, roomVersion, feeIndexValues, feesOther, userId }) => {
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
				.populate('room depositReceiptId')
				.lean()
				.exec();
			if (!currentContractInfo) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ');
			const { room: currentRoom, depositReceiptId: depositReceipt } = currentContractInfo;

			if (currentRoom.version !== roomVersion) throw new ConflictError(`Dữ liệu của phòng đã bị thay đổi !`);

			const currentPeriod = await getCurrentPeriod(currentRoom.building);
			const contractOwnerInfo = await Services.customers.getContractOwner(currentRoom._id, session);
			if (!contractOwnerInfo) throw new NotFoundError('Phòng không tồn tại chủ hợp đồng');

			let [debts, receiptsUnpaid, invoiceUnpaid] = await Promise.all([
				Entity.DebtsEntity.find({ room: currentRoom._id, status: debtStatus['PENDING'] }, { _id: 1, content: 1, amount: 1 })
					.session(session)
					.lean()
					.exec(),
				Entity.ReceiptsEntity.find(
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
					.exec(),
				Entity.InvoicesEntity.findOne(
					{ room: currentRoom._id, status: { $in: [invoiceStatus[`UNPAID`], invoiceStatus[`PARTIAL`]] }, locked: false },
					{ _id: 1, total: 1, paidAmount: 1 },
				)
					.session(session)
					.lean()
					.exec(),
			]);
			let totalDebts = 0;
			let totalReceiptsUnpaid = 0;
			let totalInvoiceUnpaid = 0;

			if (debts.length > 0) {
				totalDebts = calculateTotalDebts(debts);
				// debts = debts.map((d) => d._id);
			}
			if (receiptsUnpaid.length > 0) {
				totalReceiptsUnpaid = calculateTotalDebts(receiptsUnpaid);
				// receiptsUnpaid = receiptsUnpaid.map((r) => r._id);
			}
			if (invoiceUnpaid !== null) {
				totalInvoiceUnpaid = calculateInvoiceUnapaidAmount(invoiceUnpaid.paidAmount, invoiceUnpaid.total);
			}

			let roomFees = await Entity.FeesEntity.find({ room: currentRoom._id, unit: feeUnit['INDEX'] }).session(session).lean().exec();
			let feeIndexTotalAmount = 0;
			const formatRoomFeeIndex = generateInvoiceFees(roomFees, 0, 0, feeIndexValues, false);

			if (roomFees.length > 0) {
				const roomFeeIds = roomFees.map((f) => f._id.toString());
				validateFeeIndexMatch(roomFeeIds, feeIndexValues);

				feeIndexTotalAmount = calculateTotalFeeAmount(formatRoomFeeIndex);

				await Services.fees.updateFeeIndexValues(roomFeeIds, feeIndexValues, session);
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
				contractOwnerInfo._id,
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
						status: {
							$in: [receiptStatus[`UNPAID`], receiptStatus[`PARTIAL`]],
						},
						receiptType: { $nin: [receiptTypes[`DEPOSIT`], receiptTypes[`CHECKOUT`]] },
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

			await Entity.CustomersEntity.updateMany({ room: currentRoom._id }, { $set: { status: 0 } }, { session });
			await Entity.VehiclesEntity.updateMany({ room: currentRoom._id }, { $set: { status: 0 } }, { session });
			await Services.rooms.bumpRoomVersion(currentRoom._id, roomVersion, session);
			await Services.rooms.unLockedRoom(currentRoom._id, session);

			result = createdDepositRefund;
			return result;
		});

		return result;
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

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
exports.modifyDepositRefund = async (data) => {
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

		return currentDepositRefund;
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		if (session) session.endSession();
	}
};
