const mongoose = require('mongoose');
const Entity = require('../models');

exports.deleteDebts = async (data, cb, next) => {
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const removeDebts = await Entity.DebtsEntity.deleteMany({ room: roomObjectId, status: { $nin: ['paid', 'terminated'] } });

		if (removeDebts.deletedCount === 0) {
			cb(null, 'Không có khoản nợ nào được xóa');
		} else {
			cb(null, 'Đã xóa nợ thành công');
		}
	} catch (error) {
		next(error);
	}
};

exports.getDebtsByRoomId = async (data, cb, next) => {
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);

		const debtsAndReceiptUnpaid = await Entity.RoomsEntity.aggregate([
			{
				$match: {
					_id: roomObjectId,
				},
			},
			{
				$lookup:
					/**
					 * from: The target collection.
					 * localField: The local join field.
					 * foreignField: The target join field.
					 * as: The name for the results.
					 * pipeline: Optional pipeline to run on the foreign collection.
					 * let: Optional variables to use in the pipeline field stages.
					 */
					{
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
				$addFields: {
					receiptDeposit: {
						$arrayElemAt: ['$receiptDeposit', 0],
					},
				},
			},
		]);

		if (!debtsAndReceiptUnpaid.length || !debtsAndReceiptUnpaid[0].receiptDeposit) {
			throw new Error(`Không tồn tại hóa đơn đặt cọc !`);
		}
		cb(null, {
			_id: debtsAndReceiptUnpaid[0]?._id,
			debts: debtsAndReceiptUnpaid[0]?.debts || [],
			receiptsUnpaid: debtsAndReceiptUnpaid[0]?.receiptsUnpaid || [],
			receiptDeposit: debtsAndReceiptUnpaid[0]?.receiptDeposit,
		});
	} catch (error) {
		next(error);
	}
};
