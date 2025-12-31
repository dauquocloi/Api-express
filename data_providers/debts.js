const mongoose = require('mongoose');
const Entity = require('../models');
const { AppError, NotFoundError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { getDebtsAndReceiptUnpaid } = require('../service/debts.service');

exports.getCreateDepositRefundInfo = async (data, cb, next) => {
	try {
		const roomObjectId = new mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);

		const debtsAndReceiptUnpaid = await getDebtsAndReceiptUnpaid(roomObjectId, currentPeriod.currentMonth, currentPeriod.currentYear);

		cb(null, {
			_id: debtsAndReceiptUnpaid?._id,
			fees: debtsAndReceiptUnpaid.fees,
			debts: debtsAndReceiptUnpaid?.debts || [],
			invoiceUnpaid: debtsAndReceiptUnpaid?.invoiceUnpaid,
			receiptDeposit: debtsAndReceiptUnpaid.receiptDeposit,
			receiptsUnpaid: debtsAndReceiptUnpaid?.receiptsUnpaid || [],
		});
	} catch (error) {
		next(error);
	}
};
