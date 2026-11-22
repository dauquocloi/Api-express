const mongoose = require('mongoose');
const fs = require('fs/promises');
const Entity = require('../models');
const listFees = require('../utils/getListFeeInital');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { NotFoundError, BadRequestError, InternalError, ConflictError } = require('../AppError');
const Services = require('../service');
const { feeUnit, roomState, receiptToDepositStatus, receiptStatus, depositStatus } = require('../constants');
const { notificationJob } = require('../jobs/notification/notification.job');
const { NOTI_ROOM_DEPOSITED, NOTI_DEPOSIT_TERMINATED } = require('../jobs/constant/jobNames');
const { calculateDepositStatus } = require('../service/deposits.helper');
const { getInvoiceStatus } = require('../service/invoices.helper');
const { formatDepositFees, formatDepositDocument, generatePreviewDepositTermDocument } = require('./deposits.util');

exports.getDeposits = async (buildingId) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const deposits = await Services.deposits.getDeposits(buildingObjectId);
	return deposits;
};

exports.createDeposit = async (data) => {
	const { room, customer, interiors, fees, buildingId, roomId, receiptId } = data;

	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const roomObjectId = new mongoose.Types.ObjectId(roomId);
	const receiptObjectId = new mongoose.Types.ObjectId(receiptId);

	const currentRoom = await Services.rooms.findById(roomId).lean().exec();
	if (!currentRoom) {
		throw new BadRequestError(`Phòng với Id: ${roomId} không tồn tại !`);
	}
	if (currentRoom.roomState === roomState['HIRED']) throw new BadRequestError(`Không thể đặt cọc cho phòng đang thuê !`);
	const depositReceipt = await Services.receipts.findById(receiptId).lean().exec();

	if (!depositReceipt) {
		throw new BadRequestError(`Hóa đơn đặt cọc chưa được khởi tạo !`);
	} else if (depositReceipt.paidAmount === 0) {
		throw new BadRequestError(`Hóa đơn đặt cọc chưa thanh toán !`);
	}

	const { transactions, paidAmount } = depositReceipt;

	// const formatFees = () => {
	// 	if (!Array.isArray(fees) || !Array.isArray(listFees)) return [];

	// 	const feeMap = new Map(listFees.map((fee) => [fee.feeKey, fee]));

	// 	const depositFees = [];

	// 	for (const feeItem of fees) {
	// 		const match = feeMap.get(feeItem.feeKey);

	// 		if (!match) continue;

	// 		if (match.unit === feeUnit['INDEX']) {
	// 			depositFees.push({
	// 				feeName: match.feeName,
	// 				unit: match.unit,
	// 				firstIndex: match.firstIndex,
	// 				feeAmount: feeItem.feeAmount,
	// 				lastIndex: feeItem?.lastIndex,
	// 				iconPath: match.iconPath,
	// 				feeKey: match.feeKey,
	// 			});
	// 		} else {
	// 			depositFees.push({
	// 				feeName: match.feeName,
	// 				unit: match.unit,
	// 				feeAmount: feeItem.feeAmount,
	// 				iconPath: match.iconPath,
	// 				feeKey: match.feeKey,
	// 			});
	// 		}
	// 	}

	// 	return depositFees;
	// };

	const formatFees = formatDepositFees({ fees, listFees });
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
		fees: formatFees,
		status: calculateDepositStatus(room.depositAmount, paidAmount),
	});

	await notificationJob({ depositId: newDeposit._id, notiType: NOTI_ROOM_DEPOSITED });

	await Services.rooms.setRoomDeposited({ roomId: roomId, isDeposited: true });

	return newDeposit.toObject();
};

exports.createDepositV2 = async (data) => {
	const { room, customer, interiors, fees, roomId, note, contractPeriod } = data;

	const roomObjectId = new mongoose.Types.ObjectId(roomId);

	const currentRoom = await Services.rooms.findById(roomId).lean().exec();
	if (!currentRoom) {
		throw new BadRequestError(`Phòng với Id: ${roomId} không tồn tại !`);
	}
	if (currentRoom.roomState === roomState['HIRED']) throw new BadRequestError(`Không thể đặt cọc cho phòng đang thuê !`);

	const formatFees = formatDepositFees({ fees, listFees });

	const depositDocument = formatDepositDocument({
		customerInfo: {
			fullName: customer.fullName,
			dob: customer.dob,
			address: customer.address,
			cccd: customer.CCCD,
			cccdIssueDate: customer.cccdIssueDate,
			cccdIssueAt: customer.cccdIssueAt,
			phone: customer.phone,
		},
		fees: formatFees,
		interiors: interiors,
		depositAmount: room.depositAmount,
		contractSignDate: contractPeriod.contractSignDate,
		contractEndDate: contractPeriod.contractEndDate,
		contractTerm: room.rentalTerm,
		rent: room.rent,
		roomIndex: currentRoom.roomIndex,
		note: note,
		checkinDate: room.checkinDate,
	});

	const depositDocumentPath = await generatePreviewDepositTermDocument({ depositDocument, buildingId: currentRoom.building });

	const newDeposit = await Services.deposits.generateDeposit({
		roomId: roomObjectId,
		buildingId: currentRoom.building,
		receiptId: null,
		actualDepositAmount: 0,
		depositAmount: room.depositAmount,
		rent: room.rent,
		depositCompletionDate: room.depositCompletionDate,
		checkinDate: room.checkinDate,
		rentalTerm: room.rentalTerm,
		numberOfOccupants: room.numberOfOccupants,
		customer: customer,
		interiors: interiors,
		fees: formatFees,
		status: depositStatus['PENDING'],
		previewDocumentPath: depositDocumentPath.path,
		previewExpAt: depositDocumentPath.expAt,
		contractPeriod: {
			contractSignDate: contractPeriod.contractSignDate,
			contractEndDate: contractPeriod.contractEndDate,
		},
		note: note,
	});

	return {
		depositId: newDeposit._id,
	};
};

exports.getPreviewDepositDocument = async ({ depositId }) => {
	const deposit = await Services.deposits.findById(depositId).lean().exec();
	if (!deposit) throw new NotFoundError('Dữ liệu không tồn tại !');
	if (!deposit.previewDocument || !deposit.previewDocument.filePath) throw new NotFoundError('Dữ liệu đặt cọc chưa được khởi tạo !');
	if (deposit.previewDocument.expAt < Date.now()) throw new BadRequestError('Dữ liệu đặt cọc đã hết hạn !');

	const depositPdfBuffer = await fs.readFile(deposit.previewDocument.filePath);
	if (!depositPdfBuffer) throw new InternalError('Có lỗi xảy ra trong quá trình lấy thông tin đặt cọc !');

	return depositPdfBuffer;
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
	const { room, customer, version, depositId, fees, interiors, contractPeriod, note } = data;

	const depositObjectId = new mongoose.Types.ObjectId(depositId);

	const currentDeposit = await Services.deposits.getDepositInfoForModifyDeposit({ depositId: depositObjectId });
	const { depositAmount, receipt, roomInfo } = currentDeposit;

	const shouldModifyDepositReceipt = depositAmount !== room.depositAmount;

	let newReceiptStatus;
	if (shouldModifyDepositReceipt) {
		if (receipt.paidAmount === 0) {
			newReceiptStatus === receiptStatus['PENDING'];
		} else {
			newReceiptStatus = getInvoiceStatus(receipt.paidAmount, room.depositAmount);
		}

		const modifyReceipt = await Services.receipts.modifyReceipt({
			status: newReceiptStatus,
			receiptAmount: room.depositAmount,
			receiptObjectId: receipt._id,
			receiptVersion: receipt.version,
			receiptContent: receipt.receiptContent,
			date: receipt.date,
		});

		console.log('log of modifyReceipt: ', modifyReceipt);
	}

	const formatFees = formatDepositFees({ fees, listFees });

	const depositDocument = formatDepositDocument({
		customerInfo: {
			fullName: customer.fullName,
			dob: customer.dob,
			address: customer.address,
			cccd: customer.CCCD,
			cccdIssueDate: customer.cccdIssueDate,
			cccdIssueAt: customer.cccdIssueAt,
			phone: customer.phone,
		},
		fees: formatFees,
		interiors: interiors,
		depositAmount: room.depositAmount,
		contractSignDate: contractPeriod.contractSignDate,
		contractEndDate: contractPeriod.contractEndDate,
		contractTerm: room.rentalTerm,
		rent: room.rent,
		roomIndex: roomInfo.roomIndex,
		note: note,
		checkinDate: room.checkinDate,
	});

	const generateDepositDocument = await generatePreviewDepositTermDocument({ depositDocument, buildingId: currentDeposit.building });

	const result = await Services.deposits.modifyDeposit({
		depositId: depositObjectId,
		fees: formatFees,
		customer: customer,
		interiors: interiors || [],
		status: !shouldModifyDepositReceipt ? currentDeposit.status : receiptToDepositStatus[newReceiptStatus],
		rent: room.rent,
		depositAmount: room.depositAmount,
		actualDepositAmount: receipt.paidAmount,
		checkinDate: room.checkinDate,
		depositCompletionDate: room.depositCompletionDate,
		rentalTerm: room.rentalTerm,
		numberOfOccupants: room.numberOfOccupants,
		version,
		contractPeriod: {
			contractSignDate: contractPeriod.contractSignDate,
			contractEndDate: contractPeriod.contractEndDate,
		},
		note,
		previewExpAt: currentDeposit?.previewDocument?.expAt,
		previewDocumentPath: generateDepositDocument.path,
	});

	console.log('depositModyfied: ', result);
	return result;
};

exports.cancelDeposit = async (depositId, version, userId) => {
	const deposit = await Services.deposits.findById(depositId).lean().exec();
	if (!deposit) new NotFoundError('Dữ liệu đặt cọc không tồn tại');
	if (deposit.version !== version) throw new ConflictError('Dữ liệu đã cũ, vui lòng tải lại trang.');

	await Services.buildings.assertBuildingWritable({ buildingId: deposit.building, userId: userId });
	const currentPeriod = await getCurrentPeriod(deposit.building);
	const { currentMonth: month, currentYear: year } = currentPeriod;

	await Services.deposits.cancelledDeposit(depositId, version);

	await Services.receipts.updateReceiptPeriod({ receiptId: deposit.receipt, month, year });

	await Services.rooms.setRoomDeposited({ roomId: deposit.room, isDeposited: false });

	await notificationJob({ depositId, notiType: NOTI_DEPOSIT_TERMINATED });

	return 'Success';
};

exports.terminateDeposit = async ({ depositId, version }) => {
	const deposit = await Services.deposits.findById(depositId).populate('receipt').lean().exec();
	if (!deposit) throw new NotFoundError('Dữ liệu không tồn tại !');
	if (deposit.version !== version) throw new ConflictError('Dữ liệu đã bị thay đổi, Vui lòng tải lại trang !');
	if (deposit.receipt.status !== receiptStatus['PENDING']) throw new BadRequestError('Dữ liệu đầu vào không hợp lệ !');

	await Services.deposits.terminateDeposit(depositId, version);
	await Services.receipts.terminateReceipt(deposit.receipt._id, deposit.receipt.version);

	return 'Success';
};

// finish this
exports.uploardDepositTerm = async (data) => {
	const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);
	const buildingInfo = await Entity.BuildingsEntity.exists({ _id: buildingObjectId });
	if (!buildingInfo) throw new NotFoundError(`Tòa nhà với Id: ${buildingObjectId} không tồn tại !`);
};
