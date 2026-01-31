const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const uploadFile = require('../utils/uploadFile');
const { AppError, NotFoundError, NoDataError, InvalidInputError, ConflictError } = require('../AppError');
const Services = require('../service');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { generateInvoiceFees } = require('../service/invoices.helper');
const { calculateTotalFeeAmount } = require('../utils/calculateFeeTotal');
const { calculateTotalCheckoutCostAmount } = require('../service/checkoutCost/checkoutCosts.helper');
const { receiptStatus, receiptTypes } = require('../constants/receipt');
const { feeUnit } = require('../constants/fees');
const { validateFeeIndexMatch } = require('../service/fees.helper');
const { sourceType } = require('../constants/debts');

exports.getRoom = async (roomId) => {
	const roomObjectId = new mongoose.Types.ObjectId(roomId);
	console.time('fetch room');
	const roomInfo = await Services.rooms.getRoom(roomObjectId);
	console.timeEnd('fetch room');
	return roomInfo;
};

exports.addInterior = async (roomId, interior) => {
	const newInteriorInfo = {
		_id: new mongoose.Types.ObjectId(),
		interiorName: interior.interiorName,
		quantity: interior.interiorQuantity,
		interiorRentalDate: interior.interiorRentalDate,
	};
	const newInterior = await Services.rooms.addInterior(roomId, newInteriorInfo);
};

exports.editInterior = async (interiorId, roomId, interior) => {
	const modifyInterior = await Services.rooms.modifyInterior(roomId, interiorId, interior);
	return 'Success';
};

exports.removeInterior = async (interiorId) => {
	const interiorObjectId = new mongoose.Types.ObjectId(interiorId);

	const interiorRemoved = await Entity.RoomsEntity.findOneAndUpdate(
		{ 'interior._id': interiorObjectId },
		{ $pull: { interior: { _id: interiorObjectId } } },
		{ new: true, runValidators: true },
	);
	if (interiorRemoved != null) {
		return interiorRemoved;
	} else {
		throw new NotFoundError('Nội thất không tồn tại');
	}
};

exports.generateDepositReceiptAndFirstInvoice = async (roomId, buildingId, createrId, depositAmount, payer, stayDays, feeIndexValues) => {
	let session;
	try {
		const roomObjectId = new mongoose.Types.ObjectId(roomId);
		const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
		const createrObjectId = new mongoose.Types.ObjectId(createrId);

		session = await mongoose.startSession();
		session.startTransaction();
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const roomInfo = await Entity.RoomsEntity.findOne({ _id: roomObjectId }).session(session);
		if (!roomInfo) {
			throw new NotFoundError(`Phòng với id: ${roomId} không tồn tại !`);
		}

		// Phòng đang trống ko thể lấy fees được ! => phải lấy từ contract Draft
		const roomFees = await Services.fees.getRoomFeesAndDebts(roomObjectId, session);
		const formatRoomFees = generateInvoiceFees(roomFees.feeInfo, roomFees._id.rent, stayDays, feeIndexValues, true);
		const totalFirstInvoiceAmount = calculateTotalFeeAmount(formatRoomFees);

		const generateInvoice = await Services.invoices.createInvoice(
			{
				roomId: roomObjectId,
				listFees: formatRoomFees,
				totalInvoiceAmount: totalFirstInvoiceAmount,
				stayDays: stayDays,
				debtInfo: null,
				currentPeriod: currentPeriod,
				payerName: payer,
				creater: createrObjectId,
			},
			session,
		);

		// add creater here
		const createDepositReceipt = await Services.receipts.createReceipt(
			{
				roomObjectId: roomObjectId,
				receiptAmount: depositAmount,
				payer: payer,
				currentPeriod: currentPeriod,
				receiptContent: roomInfo.roomIndex,
				receiptType: receiptTypes['DEPOSIT'],
				initialStatus: receiptStatus['PENDING'],
			},
			session,
		);

		await session.commitTransaction();

		return {
			invoiceId: generateInvoice?._id,
			receiptId: createDepositReceipt?._id,
		};
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.modifyRent = async (roomId, rentModify) => {
	let session;

	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const room = await Entity.RoomsEntity.findOne({ _id: roomId }).session(session);
		if (!room) throw new NotFoundError('Phòng không tồn tại');

		const contract = await Entity.ContractsEntity.findOneAndUpdate(
			{ room: roomId, status: 'active' },
			{ $set: { rent: rentModify } },
			{ new: true, session },
		);
		if (!contract) throw new NotFoundError('Hợp đồng không tồn tại');

		room.roomPrice = rentModify;
		await room.save({ session });

		return { contractId: contract._id, rent: contract.rent };
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.generateCheckoutCost = async (roomId, buildingId, creatorId, feeIndexValues, feesOther, stayDays, roomVersion) => {
	let session;
	let newCheckoutCost;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const roomObjectId = new mongoose.Types.ObjectId(roomId);
			const currentRoom = await Services.rooms.assertRoomWritable({ roomId, userId: creatorId, session });

			const currentPeriod = await getCurrentPeriod(buildingId);
			const contractOwner = await Services.customers
				.findIsContractOwnerByRoomId(roomObjectId)
				.session(session)
				.populate('contract')
				.lean()
				.exec();
			if (!contractOwner) throw new NotFoundError(`Phòng không tồn tại chủ hợp đồng !`);
			if (!contractOwner.contract._id) throw new NotFoundError('Phòng không tồn tại hợp động !');

			// const roomFees = await Services.fees.getRoomFeesAndDebts(roomObjectId, session);
			// const { feeInfo } = roomFees;

			const debtsAndReceiptUnpaid = await Services.debts.getDebtsAndReceiptUnpaid(
				roomObjectId,
				currentPeriod.currentMonth,
				currentPeriod.currentYear,
				session,
			);
			const { fees, receiptDeposit } = debtsAndReceiptUnpaid;
			const roomFeeIndexIds = fees.map((fee) => (fee.unit === feeUnit['INDEX'] ? fee._id.toString() : null)).filter(Boolean);

			if (roomFeeIndexIds.length > 0) {
				validateFeeIndexMatch(roomFeeIndexIds, feeIndexValues);
			}
			const roomFeeIndex = fees.filter((f) => f.unit === feeUnit['INDEX']);

			let formatRoomFees;
			if (debtsAndReceiptUnpaid.invoiceUnpaid !== null) {
				formatRoomFees = generateInvoiceFees(roomFeeIndex, 0, stayDays, feeIndexValues, false);
			} else {
				formatRoomFees = generateInvoiceFees(fees, contractOwner.contract.rent, stayDays, feeIndexValues, true);
			}

			console.log('log of formatRoomFees: ', formatRoomFees);
			const totalCost = calculateTotalCheckoutCostAmount(
				formatRoomFees,
				debtsAndReceiptUnpaid.debts,
				debtsAndReceiptUnpaid.receiptsUnpaid,
				debtsAndReceiptUnpaid.invoiceUnpaid,
				feesOther,
			);
			console.log('log of totalCost: ', totalCost);

			let checkoutCostReceipt;
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
						contract: contractOwner.contract._id,
					},

					session,
				);
			} else {
				checkoutCostReceipt = null;
			}

			newCheckoutCost = await Services.checkoutCosts.generateCheckoutCost(
				{
					roomId: roomId,
					contractId: contractOwner.contract._id,
					buildingId: buildingId,
					creatorId: creatorId,

					customerName: contractOwner.fullName,
					debtsAndReceiptUnpaid: debtsAndReceiptUnpaid,
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
					{ roomId: roomId, sourceId: newCheckoutCost._id, sourceType: sourceType['CHECKOUT_COST'] },
					session,
				);
			}
			if (newCheckoutCost.invoiceUnpaid !== null) {
				await Services.invoices.closeAndSetDetucedInvoice(
					newCheckoutCost.invoiceUnpaid,
					'terminateContractEarly',
					newCheckoutCost._id,
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
					contractId: contractOwner.contract._id,
					contractCode: contractOwner.contract.contractCode,
					contractSignDate: contractOwner.contract.contractSignDate,
					contractEndDate: contractOwner.contract.contractEndDate,
					depositAmount: receiptDeposit.paidAmount,
					checkoutDate: Date.now(),
					checkoutType: 'checkoutEarly',
					checkoutCostId: newCheckoutCost._id,
					depositRefundId: null,
					interiors: currentRoom.interior,
					fees: fees,
					rent: contractOwner.contract.rent,
				},
				session,
			);
			// await Services.rooms.bumpRoomVersion(roomObjectId, roomVersion, session);
			// await Services.rooms.unLockedRoom(roomObjectId, session);
			await Services.rooms.completeChangeRoomState({ roomId, roomVersion }, session);
			await Services.contracts.expiredContract(contractOwner.contract._id, session);

			return 'Success';
		});
		return newCheckoutCost;
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.getDebtsAndReceiptUnpaid = async (roomId, buildingId) => {
	const roomObjectId = new mongoose.Types.ObjectId(roomId);
	const { currentMonth, currentYear } = await getCurrentPeriod(buildingId);
	const result = await Services.debts.getDebtsAndReceiptUnpaid(roomObjectId, currentMonth, currentYear);
	return result;
};

exports.getRoomFeesAndDebts = async (roomId, userId) => {
	let session;
	let feesDebts;

	try {
		session = await mongoose.startSession();

		await session.withTransaction(async () => {
			const roomObjectId = new mongoose.Types.ObjectId(roomId);

			feesDebts = await Services.fees.getRoomFeesAndDebts(roomObjectId, session);

			await Services.rooms.setWriteLockedRoom(roomId, session, null, userId);
		});

		return feesDebts;
	} finally {
		if (session) session.endSession();
	}
};

exports.getRoomHistories = async (roomId) => {
	const roomObjectId = new mongoose.Types.ObjectId(roomId);
	const result = await Services.rooms.getRoomHistories(roomObjectId);
	return result;
};

exports.getRoomHistoryDetail = async (roomHistoryId) => {
	const roomHistoryObjectId = new mongoose.Types.ObjectId(roomHistoryId);
	const result = await Services.rooms.getRoomHistoryDetail(roomHistoryObjectId);
	return result;
};

//================================ UN REFACTED =====================================//

exports.importImage = async (data, cb, next) => {
	try {
		const roomId = new mongoose.Types.ObjectId(`${data.roomId}`);
		const currentRoom = await Entity.RoomsEntity.findById(roomId);
		if (!currentRoom) throw new Error('Phòng không tồn tại !');

		const roomImages = [];
		for (const image of data.imagesRoom) {
			const handleuploadFile = await uploadFile(image);
			roomImages.push(handleuploadFile.Key);
		}

		if (currentRoom.roomImage?.ref) {
			currentRoom.roomImage.ref = roomImages;
		}

		const importedRoomImages = await currentRoom.save();
		cb(null, importedRoomImages);
	} catch (error) {
		next(error);
	}
};

exports.updateNoteRoom = async (data, cb, next) => {
	try {
		const roomObjectId = new mongoose.Types.ObjectId(data.roomId);
		const updatedRoom = await Entity.RoomsEntity.findByIdAndUpdate(
			roomObjectId,
			{ $set: { note: data.note } },
			{ new: true, runValidators: true },
		);
		if (!updatedRoom) throw new Error('Cập nhật ghi chú không thành công !');
		cb(null, 'Cập nhật ghi chú thành công !');
	} catch (error) {
		next(error);
	}
};

exports.deleteDebts = async (roomId) => {
	const findDebts = await Entity.DebtsEntity.find({ room: roomId, status: { $in: ['closed', 'pending'] } });
	if (!findDebts || findDebts.length === 0) throw new NotFoundError('Nợ không tồn tại');

	// const totalDebts = findDebts.reduce((sum, debt) => sum + debt.amount, 0);
	// if (findDebts[0].status === 'closed' && findDebts[0].sourceId !== null) {
	// 	const currentInvoice = await Entity.InvoicesEntity.findOne({ _id: findDebts[0].sourceId });
	// 	if (!currentInvoice) throw new AppError(errorCodes.notExist, 'Hóa đơn cho khoản nợ không tồn tại!', 404);

	// 	const calculateInvoiceTotalAmount = currentInvoice.total - totalDebts;
	// 	currentInvoice.debts = null;
	// 	currentInvoice.total = calculateInvoiceTotalAmount;
	// 	currentInvoice.status = calculateInvoiceTotalAmount <= currentInvoice.paidAmount ? 'paid' : currentInvoice.status;

	// 	await currentInvoice.save({ session });
	// }

	await Entity.DebtsEntity.updateMany({ room: roomId, status: { $in: ['closed', 'pending'] } }, { $set: { status: 'terminated' } });

	return 'Success';
};
