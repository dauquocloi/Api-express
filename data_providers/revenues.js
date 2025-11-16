const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const formatFee = require('../utils/formatFee');

exports.createIncidentalRevenue = async (data, cb, next) => {
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const newIncidentalRevenue = await Entity.IncidentalRevenuesEntity.create({
			building: buildingObjectId,
			month: currentPeriod?.currentMonth,
			year: currentPeriod?.currentYear,
			amount: data.amount,
			content: data.content,
			collector: data.collector,
		});
		cb(null, newIncidentalRevenue);
	} catch (error) {
		next(error);
	}
};

exports.modifyIncidentalRevenue = async (data, cb, next) => {
	try {
		const incidentalRevenueObjectId = mongoose.Types.ObjectId(data.incidentalRevenueId);

		const incidentalRevenue = await Entity.IncidentalRevenuesEntity.findOne({ _id: incidentalRevenueObjectId });

		if (incidentalRevenue == null) {
			throw new Error('Không có dữ liệu khoản chi phát sinh');
		}

		Object.assign(incidentalRevenue, data);
		incidentalRevenue.save();

		cb(null, 'success');
	} catch (error) {
		next(error);
	}
};

exports.deleteIncidentalRevenue = async (data, cb, next) => {
	try {
		const incidentalRevenueObjectId = mongoose.Types.ObjectId(data.incidentalRevenueId);

		const incidentalRevenue = await Entity.IncidentalRevenuesEntity.deleteOne({ _id: incidentalRevenueObjectId });

		if (incidentalRevenue.deletedCount === 0) {
			throw new Error('Không tìm thấy dữ liệu');
		}

		cb(null, incidentalRevenue);
	} catch (error) {
		next(error);
	}
};

exports.getFeeRevenueDetail = async (data, cb, next) => {
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		var month;
		var year;
		var status;
		var feeName;

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const { currentMonth, currentYear } = currentPeriod;
		if (!data.month || !data.year) {
			month = currentMonth;
			year = currentYear;
			status = 'unlock';
		} else {
			month = parseInt(data.month);
			year = parseInt(data.year);
			if (month == currentMonth && year == currentYear) {
				status = 'unlock';
			} else status = 'lock';
		}

		const feeRevenue = await Entity.BuildingsEntity.aggregate([
			{
				$match: {
					_id: buildingObjectId,
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: '_id',
					foreignField: 'building',
					as: 'rooms',
				},
			},
			{
				$unwind: {
					path: '$rooms',
				},
			},
			{
				$lookup: {
					from: 'invoices',
					let: {
						roomId: '$rooms._id',
						month: month,
						year: year,
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$room', '$$roomId'],
										},
										{
											$eq: ['$month', '$$month'],
										},
										{
											$eq: ['$year', '$$year'],
										},
									],
								},
							},
						},
					],
					as: 'invoice',
				},
			},
			{
				$unwind: {
					path: '$invoice',
				},
			},
			{
				$lookup: {
					from: 'transactions',
					let: {
						invoiceId: '$invoice._id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$invoice', '$$invoiceId'],
								},
							},
						},
					],
					as: 'transactions',
				},
			},
			{
				$project: {
					_id: 1,
					room: {
						_id: '$rooms._id',
						roomIndex: '$rooms.roomIndex',
						roomState: '$rooms.roomState',
					},
					invoice: 1,
					transactions: 1,
				},
			},
			{
				$group: {
					_id: '$_id',
					feeRevenueInfo: {
						$push: {
							_id: '$room._id',
							roomIndex: '$room.roomIndex',
							roomState: '$room.roomState',
							invoice: '$invoice',
							transaction: '$transactions',
						},
					},
				},
			},
		]);
		if (feeRevenue.length === 0) {
			throw new Error(`Phí với key ${data.feeKey} không tồn tại`);
		}

		const { feeRevenueInfo } = feeRevenue[0];

		// kiểm tra tính tồn tại của feeKey gửi về:
		const checkExistedRoom = feeRevenueInfo.some((roomItem) =>
			roomItem.invoice.fee.some((feeItem) => {
				const trimmedFeeKey = feeItem.feeKey?.slice(0, -2);
				if (trimmedFeeKey === data.feeKey) {
					feeName = feeItem.feeName;
					return true;
				}
				return false;
			}),
		);

		if (!checkExistedRoom) throw new Error(`Phí ${data.feeKey} không tồn tại!`);

		var totalFeeAmount = 0;
		var totalActualCurrentFeePaidAmount = 0;
		for (const roomItem of feeRevenueInfo) {
			const { invoice, transaction } = roomItem;
			const listFeeFormated = formatFee(invoice.fee);
			const totalTransaction = transaction.reduce((sum, item) => sum + item.amount, 0);
			var remaining = totalTransaction;

			for (const feeItem of listFeeFormated) {
				const actualPaid = Math.min(remaining, feeItem.amount);
				const actualFeePaidAmount = remaining === 0 ? 0 : actualPaid;

				if (feeItem.feeKey === data.feeKey) {
					totalFeeAmount += feeItem.amount;
					totalActualCurrentFeePaidAmount += actualFeePaidAmount;
				}
				remaining -= actualPaid;
			}
		}

		const listRoomUnPaid =
			status === 'lock'
				? []
				: feeRevenueInfo
						.map((roomItem) => {
							const { invoice } = roomItem;
							if (invoice.status === 'unpaid' || invoice.status === 'partial') {
								return {
									invoiceId: invoice._id,
									roomIndex: roomItem.roomIndex,
									total: invoice.total,
									status: invoice.status,
								};
							} else return null;
						})
						.filter(Boolean);

		cb(null, {
			feeDetail: { totalFeeAmount: totalFeeAmount, totalActualFeePaidAmount: totalActualCurrentFeePaidAmount, feeName: feeName },
			listRoomUnPaid: listRoomUnPaid,
			period: {
				month,
				year,
			},
			status: status,
		});
	} catch (error) {
		next(error);
	}
};
