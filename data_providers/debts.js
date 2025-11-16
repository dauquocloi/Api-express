const mongoose = require('mongoose');
const Entity = require('../models');
const AppError = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const getCurrentPeriod = require('../utils/getCurrentPeriod');

exports.deleteDebts = async (data, cb, next) => {
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);

		const findDebts = await Entity.DebtsEntity.find({ room: roomObjectId, status: { $in: ['closed', 'pending'] } });
		if (!findDebts || findDebts.length === 0) throw new AppError(errorCodes.notExist, 'Không tồn tại khoản nợ nào', 200);

		const totalDebts = findDebts.reduce((sum, debt) => sum + debt.amount, 0);
		if (findDebts[0].status === 'closed' && findDebts[0].sourceId !== null) {
			const currentInvoice = await Entity.InvoicesEntity.findOne({ _id: findDebts[0].sourceId });
			if (!currentInvoice) throw new AppError(errorCodes.notExist, 'Hóa đơn cho khoản nợ không tồn tại!', 404);

			const calculateInvoiceTotalAmount = currentInvoice.total - totalDebts;
			currentInvoice.debts = null;
			currentInvoice.total = calculateInvoiceTotalAmount;
			currentInvoice.status = calculateInvoiceTotalAmount <= currentInvoice.paidAmount ? 'paid' : currentInvoice.status;
			//=> send new invoice to customer;
			await currentInvoice.save({ session });
		}

		await Entity.DebtsEntity.updateMany(
			{ room: roomObjectId, status: { $in: ['closed', 'pending'] } },
			{ $set: { status: 'terminated' } },
			{ session },
		);

		await session.commitTransaction();
		cb(null, 'success');
	} catch (error) {
		if (session) await session.abortTransaction();
		next(error);
	} finally {
		if (session) session.endSession();
	}
};

exports.getCreateDepositRefundInfo = async (data, cb, next) => {
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);

		const [debtsAndReceiptUnpaid] = await Entity.RoomsEntity.aggregate([
			{
				$match: {
					_id: roomObjectId,
				},
			},
			{
				$lookup: {
					from: 'receipts',
					let: {
						roomObjectId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$room', '$$roomObjectId'],
										},
										{
											$eq: ['$receiptType', 'deposit'],
										},
										{
											$eq: ['$isActive', true],
										},
									],
								},
							},
						},
						{
							$project: {
								_id: 1,
								amount: 1,
								paidAmount: 1,
								isActive: 1,
							},
						},
					],
					as: 'receiptDeposit',
				},
			},
			{
				$lookup: {
					from: 'debts',
					let: {
						roomObjectId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$room', '$$roomObjectId'],
										},
										{
											$eq: ['$status', 'pending'],
										},
									],
								},
							},
						},
					],
					as: 'debts',
				},
			},
			{
				$lookup: {
					from: 'receipts',
					let: {
						roomObjectId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$room', '$$roomObjectId'],
										},
										{
											$in: ['$receiptType', ['incidental', 'debts']],
										},
										{
											$not: {
												$in: ['$status', ['terminated', 'cancelled', 'paid']],
											},
										},
										{
											$eq: ['$locked', false],
										},
									],
								},
							},
						},
					],
					as: 'receiptsUnpaid',
				},
			},
			{
				$lookup: {
					from: 'invoices',
					localField: '_id',
					foreignField: 'room',
					pipeline: [
						{
							$match: {
								month: currentPeriod.currentMonth,
								year: currentPeriod.currentYear,
								status: 'unpaid',
							},
						},
						{
							$project: {
								_id: 1,
								month: 1,
								year: 1,
								status: 1,
								paidAmount: 1,
								total: 1,
								invoiceContent: 1,
							},
						},
					],
					as: 'invoiceUnpaid',
				},
			},

			{
				$lookup: {
					from: 'fees',
					localField: '_id',
					foreignField: 'room',
					pipeline: [
						{
							$match: {
								unit: {
									$eq: 'index',
								},
							},
						},
						{
							$project: {
								_id: 1,
								feeName: 1,
								unit: 1,
								lastIndex: 1,
								feeKey: 1,
								room: 1,
								feeAmount: 1,
							},
						},
					],
					as: 'fees',
				},
			},

			{
				$addFields: {
					receiptDeposit: {
						$arrayElemAt: ['$receiptDeposit', 0],
					},
					invoiceUnpaid: {
						$ifNull: [
							{
								$arrayElemAt: ['$invoiceUnpaid', 0],
							},
							null,
						],
					},
				},
			},
		]);

		if (!debtsAndReceiptUnpaid) throw new AppError(errorCodes.notExist, `Phòng với Id: ${data.roomId} không tồn tại !`, 404);
		if (!debtsAndReceiptUnpaid.receiptDeposit) throw new AppError(errorCodes.notExist, `Hóa đơn đặt cọc không tồn tại !`, 404);

		cb(null, {
			_id: debtsAndReceiptUnpaid?._id,
			debts: debtsAndReceiptUnpaid?.debts || [],
			receiptsUnpaid: debtsAndReceiptUnpaid?.receiptsUnpaid || [],
			invoiceUnpaid: debtsAndReceiptUnpaid?.invoiceUnpaid,
			receiptDeposit: debtsAndReceiptUnpaid.receiptDeposit,
			fees: debtsAndReceiptUnpaid.fees,
		});
	} catch (error) {
		next(error);
	}
};
