const { AppError, InvalidInputError, NotFoundError, BadRequestError } = require('../AppError');
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
const { receiptTypes } = require('../constants/receipt');

exports.getDepositRefunds = async (buildingId, mode) => {
	const buildingObjectId = mongoose.Types.ObjectId(buildingId);
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
	const depositRefundObjectId = mongoose.Types.ObjectId(depositRefundId);
	const [depositRefund] = await Entity.DepositRefundsEntity.aggregate(
		Pipelines.depositRefunds.getDepositRefundDetailPipeline(depositRefundObjectId),
	);
	if (!depositRefund) throw new NotFoundError('Không có dữ liệu');
	return depositRefund;
};

exports.confirmDepositRefund = async (depositRefundId, spenderId) => {
	let session;
	try {
		const depositRefundObjectId = mongoose.Types.ObjectId(depositRefundId);
		const spenderObjectId = mongoose.Types.ObjectId(spenderId);

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

exports.generateDepositRefund = async (data) => {
	let session;
	try {
		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const { buildingId, contractId, receiptId, roomId, creatorId = null } = data;

		const [room, building, contract, depositReceipt] = await Promise.all([
			Entity.RoomsEntity.exists({ _id: roomId }),
			Entity.BuildingsEntity.exists({ _id: buildingId }),
			Entity.ContractsEntity.exists({ _id: contractId }),
			Entity.ReceiptsEntity.exists({ _id: receiptId }),
		]);
		if (!building) throw new NotFoundError(`Tòa nhà với Id: ${buildingId} không tồn tại !`);
		if (!contract) throw new NotFoundError(`Hợp đồng với Id: ${contractId} không tồn tại !`);
		if (!depositReceipt) throw new NotFoundError(`Hóa đơn đặt cọc với Id: ${receiptId} không tồn tại`);
		if (!room) throw new NotFoundError(`Phòng với Id: ${roomId} không tồn tại !`);

		session = await mongoose.startSession();
		session.startTransaction();

		const checkExistedDepositRefund = await Services.depositRefunds.getDepositRefundByContractId(contractId, session);
		if (checkExistedDepositRefund !== null) throw new BadRequestError('Phiếu hoàn cọc đã tồn tại');

		const onGetCurrentPeriod = getCurrentPeriod(buildingId);
		const [depositReceiptInfo, contractOwnerInfo] = await Promise.all([
			Services.receipts.getReceiptDetail(receiptId, session),
			Services.customers.getContractOwner(roomId, session),
		]);

		let [debts, receiptsUnpaid, invoiceUnpaid] = await Promise.all([
			Entity.DebtsEntity.find({ room: roomId, status: 'pending' }, { _id: 1, content: 1, amount: 1 }).session(session).lean().exec(),
			Entity.ReceiptsEntity.find(
				{
					room: roomId,
					status: {
						$in: ['unpaid', 'partial'],
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
				{ room: roomId, status: { $in: ['unpaid', 'partial'] }, locked: false },
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

		let roomFees = await Services.fees.getRoomFeesAndDebts(roomObjectId, session);
		roomFees = roomFees.feeInfo.filter((f) => f.unit === 'index');

		if (roomFees.length === 0) return 0;
		const inputIds = Object.keys(data.feeIndexValues);
		if (roomFees.length !== inputIds.length) {
			throw new InvalidInputError('Số lượng phí không khớp phòng hiện tại');
		}
		const roomFeeIds = roomFees.map((f) => f._id.toString());
		const isValid = inputIds.every((id) => roomFeeIds.includes(id));
		if (!isValid) {
			throw new InvalidInputError('Phí không hợp lệ');
		}

		const formatRoomFeeIndex = generateInvoiceFees(roomFees, 0, 0, data.feeIndexValues, false);
		const feeIndexTotalAmount = calculateTotalFeeAmount(formatRoomFeeIndex);

		await Services.fees.updateFeeIndexValues(roomFeeIds, data.feeIndexValues, session);

		// const feeIndexValuesAmount = await onUpdateFeeIndexValues();
		const currentPeriod = await onGetCurrentPeriod;

		const totalFeesOther = calculateTotalFeesOther(data.feesOther);

		console.log(depositReceiptInfo.paidAmount, totalDebts, totalReceiptsUnpaid, totalInvoiceUnpaid, totalFeesOther, feeIndexTotalAmount);

		const depositRefundAmount = calculateDepositRefundAmount(
			depositReceiptInfo.paidAmount,
			totalDebts,
			totalReceiptsUnpaid,
			totalInvoiceUnpaid,
			totalFeesOther,
			feeIndexTotalAmount,
		);
		console.log('log of depositRefundAmount: ', depositRefundAmount);

		const createdDepositRefund = await Services.depositRefunds.createDepositRefund(
			roomId,
			formatRoomFeeIndex,
			data.feesOther,
			depositRefundAmount,
			invoiceUnpaid?._id,
			buildingId,
			contractId,
			receiptId,
			contractOwnerInfo._id,
			debts,
			receiptsUnpaid,
			currentPeriod,
			creatorId,
			session,
		);
		if (receiptsUnpaid.length > 0) {
			await Entity.ReceiptsEntity.updateMany(
				{
					room: roomId,
					status: {
						$in: ['unpaid', 'partial'],
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
				},
				{ session },
			);
		}
		if (debts.length > 0) {
			await Entity.DebtsEntity.updateMany(
				{ room: roomId, status: 'pending' },
				{
					$set: {
						status: 'closed',
						locked: true,
					},
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
				},
				{ session },
			);
		}

		await Promise.all([
			Entity.CustomersEntity.updateMany({ room: roomObjectId }, { $set: { status: 0 } }, { session }),
			Entity.VehiclesEntity.updateMany({ room: roomObjectId }, { $set: { status: 0 } }, { session }),
		]);

		await session.commitTransaction();

		return createdDepositRefund;
	} catch (error) {
		if (session) await session.abortTransaction();
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
		const depositRefundObjectId = mongoose.Types.ObjectId(depositRefundId);

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
