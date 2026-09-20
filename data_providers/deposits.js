const mongoose = require('mongoose');
const Entity = require('../models');
const listFees = require('../utils/getListFeeInital');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { NotFoundError, BadRequestError, InternalError } = require('../AppError');
const Services = require('../service');
const { feeUnit } = require('../constants');
const { notificationJob } = require('../jobs/notification/notification.job');
const { NOTI_ROOM_DEPOSITED, NOTI_DEPOSIT_TERMINATED } = require('../jobs/constant/jobNames');
const { calculateDepositStatus } = require('../service/deposits.helper');
const { getInvoiceStatus } = require('../service/invoices.helper');

exports.getDeposits = async (buildingId) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const deposits = await Services.deposits.getDeposits(buildingObjectId);
	return deposits;
};

exports.createDeposit = async (data) => {
	const { room, customer, interiors, fees, buildingId, roomId, receiptId } = data;

	let result;

	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const roomObjectId = new mongoose.Types.ObjectId(roomId);
	const receiptObjectId = new mongoose.Types.ObjectId(receiptId);

	const currentRoom = await Services.rooms.findById(roomId).lean().exec();
	if (!currentRoom) {
		throw new BadRequestError(`Phòng với Id: ${roomId} không tồn tại !`);
	}
	if (currentRoom.roomState === 1) throw new BadRequestError(`Không thể đặt cọc cho phòng đang thuê !`);
	const depositReceipt = await Services.receipts.findById(receiptId).lean().exec();

	if (!depositReceipt) {
		throw new BadRequestError(`Hóa đơn đặt cọc chưa được khởi tạo !`);
	} else if (depositReceipt.paidAmount === 0) {
		throw new BadRequestError(`Hóa đơn đặt cọc chưa thanh toán !`);
	}

	const { transactions, paidAmount } = depositReceipt;

	const getInitialFeesByFeeKey = () => {
		if (!Array.isArray(fees) || !Array.isArray(listFees)) return [];

		const feeMap = new Map(listFees.map((fee) => [fee.feeKey, fee]));

		const depositFees = [];
		for (const feeItem of fees) {
			const match = feeMap.get(feeItem.feeKey);

			if (match) {
				if (match.unit === feeUnit['INDEX']) {
					fees.push({
						feeName: match.feeName,
						unit: match.unit,
						firstIndex: match.firstIndex,
						feeAmount: feeItem.feeAmount,
						lastIndex: feeItem?.lastIndex,
						iconPath: match.iconPath,
						feeKey: match.feeKey,
					});
				} else {
					fees.push({
						feeName: match.feeName,
						unit: match.unit,
						feeAmount: feeItem.feeAmount,
						iconPath: match.iconPath,
						feeKey: match.feeKey,
					});
				}
			}
		}

		return depositFees;
	};

	const newDeposit = await Services.deposits.generateDeposit({
		roomId: roomObjectId,
		buildingId: buildingObjectId,
		receiptId: receiptObjectId,
		rent: room.rent,
		depositAmount: room.depositAmount,
		actualDepositAmount: paidAmount,
		depositCompletionDate: room.depositCompletionDate,
		checkinDate: room.checkinDate,
		rentalTerm: room.rentalTerm,
		numberOfOccupants: room.numberOfOccupants,
		customer: customer,
		interiors: interiors,
		fees: getInitialFeesByFeeKey(),
		status: calculateDepositStatus(room.depositAmount, paidAmount),
	});

	await notificationJob({ depositId: newDeposit._id, notiType: NOTI_ROOM_DEPOSITED });

	await Services.rooms.setRoomDeposited({ roomId: roomId, isDeposited: true });

	result = newDeposit.toObject();

	throw new InternalError('Stop for testing');
	return 'Success';
};

exports.getDepositDetail = async (depositId, buildingId) => {
	const depositObjectId = new mongoose.Types.ObjectId(depositId);

	const depositDetail = await Services.deposits.getDepositDetail({ depositId: depositObjectId });

	const bankAccount = await Services.bankAccounts.findByBuildingId(buildingId).populate('bank').lean().exec();
	if (!bankAccount) throw new NotFoundError('Không tìm thấy tài khoản ngân hàng của tòa nhà !');

	return {
		...depositDetail,
		paymentInfo: {
			_id: bankAccount._id,
			accountNumber: bankAccount.accountNumber,
			accountName: bankAccount.accountName,
			bank: bankAccount.bank,
		},
	};
};

exports.modifyDeposit = async (data) => {
	const { room, customer, version, depositId, fees, interiors } = data;

	const depositObjectId = new mongoose.Types.ObjectId(depositId);

	const currentDeposit = await Services.deposits.getDepositInfoForModifyDeposit({ depositId: depositObjectId });
	const { depositAmount } = currentDeposit;

	// create new Receipt if depositAmount raise
	let currentDepositAmount = depositAmount;
	const shouldModifyDepositReceipt = currentDepositAmount !== room.depositAmount;

	let depositNewStatus;
	let receiptPaidAmount = 0;
	if (shouldModifyDepositReceipt) {
		const { transactions, receipt } = currentDeposit;

		if (transactions?.length > 0) {
			receiptPaidAmount = transactions.reduce((sum, item) => sum + item.amount, 0);
		} else receiptPaidAmount = 0;

		depositNewStatus = getInvoiceStatus(receiptPaidAmount, room.depositAmount);

		const modifyReceipt = await Services.receipts.modifyReceipt({
			status: depositNewStatus,
			amount: room.depositAmount,
			receiptId: receipt._id,
		});

		console.log('log of modifyReceipt: ', modifyReceipt);
	}

	// ?????????????????????????
	const getInitialFeesByFeeKey = () => {
		let formatFeesData = [];
		for (const feeItem of fees) {
			const normalize = (str) => str?.toString().trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
			const findFeeMatch = listFees.find((fee) => normalize(fee.feeKey) === normalize(feeItem.feeKey));
			if (findFeeMatch) {
				if (findFeeMatch.unit === feeUnit['INDEX']) {
					formatFeesData.push({ ...findFeeMatch, feeAmount: feeItem.feeAmount, lastIndex: feeItem.lastIndex });
				} else {
					formatFeesData.push({ ...findFeeMatch, feeAmount: feeItem.feeAmount });
				}
			}
		}
		return formatFeesData;
	};

	const formatInteriors = () => {
		if (interiors?.length > 0) {
			return interiors.map((i) => ({
				interiorName: i.interiorName,
				interiorRentalDate: i.interiorRentalDate ?? new Date(),
				quantity: i.quantity,
			}));
		} else return [];
	};

	await Services.deposits.modifyDeposit({
		depositId: depositObjectId,
		fees: getInitialFeesByFeeKey(),
		customer: customer,
		interiors: formatInteriors(),
		status: !shouldModifyDepositReceipt ? currentDeposit.status : depositNewStatus,
		rent: room.rent,
		depositAmount: room.depositAmount,
		actualDepositAmount: !shouldModifyDepositReceipt ? currentDeposit.actualDepositAmount : receiptPaidAmount,
		checkinDate: room.checkinDate,
		depositCompletionDate: room.depositCompletionDate,
		rentalTerm: room.rentalTerm,
		numberOfOccupants: room.numberOfOccupants,
		version,
	});

	throw new InternalError('Stop for testing');
	return;
};

exports.terminateDeposit = async (depositId, version) => {
	const deposit = await Services.deposits.findById(depositId).lean().exec();
	if (!deposit) NotFoundError('Dữ liệu đặt cọc không tồn tại');

	const currentPeriod = await getCurrentPeriod(deposit.building);
	const { currentMonth: month, currentYear: year } = currentPeriod;

	await Services.deposits.cancelledDeposit(depositId, version);

	await Services.receipts.updateReceiptPeriod({ receiptId: deposit.receipt, month, year });

	await Services.rooms.setRoomDeposited({ roomId: deposit.room, isDeposited: false });

	throw new InternalError('Stop for testing');
	await notificationJob({ depositId, notiType: NOTI_DEPOSIT_TERMINATED });

	return 'Success';
};

// finish this
exports.uploardDepositTerm = async (data) => {
	const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);
	const buildingInfo = await Entity.BuildingsEntity.exists({ _id: buildingObjectId });
	if (!buildingInfo) throw new NotFoundError(`Tòa nhà với Id: ${buildingObjectId} không tồn tại !`);
};
