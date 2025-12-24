const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
const Entity = require('../models');
const listFeeInitial = require('../utils/getListFeeInital');
const { NotFoundError, BadRequestError, InternalError } = require('../AppError');
const Services = require('../service');
const { calculateTotalFeeAmount } = require('../utils/calculateFeeTotal');
const { generateInvoiceFeesFromReq } = require('../service/invoices.helper');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { receiptTypes, receiptStatus } = require('../constants/receipt');
const { feeUnit } = require('../constants/fees');
const formatInitialFees = require('../utils/formatInitialFees');
const { invoiceStatus } = require('../constants/invoices');

exports.prepareGenerateContract = async (
	roomId,
	buildingId,
	createrId,

	finance,
	fees,
	interiors,
	customers,
	contractPeriod,
	note,
	stayDays,
) => {
	let session;
	let result;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentRoom = await Services.rooms.getRoomInfo(roomId, session);
			if (currentRoom.roomState !== 0) throw new BadRequestError('Bạn không thể tạo hợp đồng mới cho phòng đang thuê !');

			const currentPeriod = await getCurrentPeriod(buildingId);

			const getRoomFees = formatInitialFees(fees);
			console.log('getRoomFees: ', getRoomFees);
			let formatRoomFees = [];
			if (getRoomFees.length > 0) {
				formatRoomFees = generateInvoiceFeesFromReq(getRoomFees, finance.rent, stayDays);
			}
			const totalInvoice = calculateTotalFeeAmount(formatRoomFees);
			console.log('formatRoomFees: ', formatRoomFees);

			const firstInvoice = await Services.invoices.createInvoice(
				{
					roomId: currentRoom._id,
					listFees: formatRoomFees,
					totalInvoiceAmount: totalInvoice,
					stayDays: stayDays,
					debtInfo: null,
					currentPeriod: currentPeriod,
					payerName: customers[0]?.fullName ?? '',
					creater: createrId,
					initialStatus: invoiceStatus['PENDING'],
				},
				session,
			);

			const existedDeposit = await Services.deposits.findDepositByRoomId(roomId, session);
			console.log('log of existedDeposit: ', existedDeposit);
			let depositReceiptId;
			if (!existedDeposit) {
				const createDepositReceipt = await Services.receipts.createReceipt(
					{
						roomObjectId: roomId,
						receiptAmount: finance.depositAmount,
						payer: customers[0]?.fullName ?? '',
						currentPeriod: currentPeriod,
						receiptContent: `Tiền cọc phòng ${currentRoom.roomIndex}`,
						receiptType: receiptTypes['DEPOSIT'],
						initialStatus: receiptStatus['PENDING'],
					},
					session,
				);
				depositReceiptId = createDepositReceipt._id;
			} else {
				depositReceiptId = existedDeposit.receipt;
				await Services.receipts.modifyDepositReceipt(
					{
						receiptObjectId: existedDeposit.receipt,
						receiptAmount: finance.depositAmount,
					},
					session,
				);
			}

			const formatFeesForContractDraft = fees.map((fee) => ({ feeAmount: fee.feeAmount, feeKey: fee.feeKey, lastIndex: fee.secondIndex ?? 0 }));
			const contractDraftData = {
				room: currentRoom._id,
				rent: finance.rent,
				depositAmount: finance.depositAmount, // nếu deposit đã tồn tại ?
				depositReceiptId: depositReceiptId,
				firstInvoiceId: firstInvoice._id,
				depositId: existedDeposit ? existedDeposit._id : null,

				interiors: interiors,
				fees: formatFeesForContractDraft,
				customers: customers,
				contractSignDate: contractPeriod.contractSignDate,
				contractEndDate: contractPeriod.contractEndDate,
				contractTerm: contractPeriod.contractTerm,
				note: note,
			};

			const contractDraft = await Services.contracts.createContractDraft(contractDraftData, session);
			if (!contractDraft) throw new InternalError('Có lỗi trong quá trình tạo hợp đồng mới !');

			await Services.rooms.bumpRoomVersionBlind(roomId, session);

			result = {
				contractDraftId: contractDraft._id,
				invoiceId: firstInvoice._id,
				receiptId: depositReceiptId,
			};
			return result;
		});
		console.log('log of result from prepareGenerateContract: ', result);
		return result;
	} finally {
		if (session) session.endSession();
	}
};

exports.generateContract = async (contractDraftId) => {
	let session;
	let result;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const contractDraft = await Services.contracts.getContractDraftById(contractDraftId, session);
			const contractInvoice = await Services.invoices.findByIdQuery(contractDraft.firstInvoiceId, session);
			if (!contractInvoice) throw new NotFoundError('Hóa đơn tiền nhà không tồn tại');
			if (contractInvoice.status === invoiceStatus['PENDING'] || contractInvoice.status === invoiceStatus['UNPAID']) {
				throw new BadRequestError('Cần thanh toán hóa đơn tiền nhà trước khi tạo hợp đồng');
			}

			const currentRoom = await Entity.RoomsEntity.findOne({ _id: contractDraft.room }).session(session);
			if (!currentRoom) throw new NotFoundError(`Phòng không tồn tại`);

			currentRoom.roomPrice = contractDraft.rent;
			currentRoom.roomDeposit = contractDraft.depositAmount;
			currentRoom.roomState = 1;
			currentRoom.interior = contractDraft.interiors;
			currentRoom.isDeposited = false;
			currentRoom.version = currentRoom.version + 1;
			await currentRoom.save({ session });

			let vehicles = [];
			let customersData = contractDraft.customers?.map((cus, index) => {
				if (cus.vehicleLicensePlate && cus.vehicleLicensePlate?.trim() !== '') {
					vehicles.push({
						licensePlate: cus.vehicleLicensePlate,
						fromDate: new Date(),
						owner: cus.phone || null,
						image: '',
						room: contractDraft.room,
						status: 'active',
					});
				}
				return {
					fullName: cus.fullName,
					gender: cus.sex.toLowerCase(),
					isContractOwner: index === 0 ? true : false,
					birthday: cus.dob,
					permanentAddress: cus.address,
					phone: cus.phone,
					avatar: '',
					cccd: cus.cccd,
					cccdIssueDate: cus.cccdIssueDate,
					cccdIssueAt: cus.cccdIssueAt,
					status: 1,
					room: contractDraft.room,
					temporaryResidence: false,
					checkinDate: new Date(),
					checkoutDate: contractDraft.contractEndDate,
				};
			});

			const createdCustomers = await Entity.CustomersEntity.insertMany(customersData, { session });

			if (vehicles?.length > 0) {
				await Entity.VehiclesEntity.insertMany(vehicles, { session });
			}

			await Entity.FeesEntity.deleteMany({ room: contractDraft.room }, { session });

			const feesData = contractDraft.fees
				?.map((fee) => {
					const intialFee = listFeeInitial.find((f) => f.feeKey === fee.feeKey);
					if (!intialFee) return null;

					return {
						feeAmount: fee.feeAmount,

						feeName: intialFee.feeName,
						unit: intialFee.unit,
						lastIndex: intialFee.unit === 'index' ? fee.lastIndex : undefined,
						feeKey: intialFee.feeKey,
						iconPath: intialFee.iconPath,
						room: contractDraft.room,
					};
				})
				.filter(Boolean);
			if (feesData.length > 0) {
				await Entity.FeesEntity.insertMany(feesData, { session });
			}

			// update depositReceiptType from deposit => incidental
			const depositReceipt = await Entity.ReceiptsEntity.findOne({ _id: contractDraft.depositReceiptId }).session(session);
			if (!depositReceipt) throw new NotFoundError(`Hóa đơn đặt cọc không tồn tại !`);
			if (depositReceipt.status === receiptStatus['PENDING']) {
				depositReceipt.status = receiptStatus['UNPAID'];
				depositReceipt.version = depositReceipt.version + 1;
				await depositReceipt.save({ session });
			}

			if (contractDraft.depositId) {
				await Entity.DepositsEntity.updateOne(
					{
						_id: contractDraft.depositId,
					},
					{ $set: { status: 'close' }, $inc: { version: 1 } },
					{ session },
				);
			}

			// const [createContract] = await Entity.ContractsEntity.create(
			// 	[
			// 		{
			// 			createdAt: new Date(),
			// 			fees: feesData,
			// 			rent: data.rent,
			// 			contractSignDate: data.contractSignDate,
			// 			contractEndDate: data.contractEndDate,
			// 			contractTerm: data.contractTerm,
			// 			status: 'active',
			// 			room: contractDraft.room,
			// 			contractCode: contractCode,
			// 			depositReceiptId: data.receipt,
			// 			depositId: data.depositId ?? null,
			// 		},
			// 	],
			// 	{ session },
			// );

			const contractCreated = await Services.contracts.generateContract(
				{
					rent: contractDraft.rent,
					roomFees: feesData,
					contractSignDate: contractDraft.contractSignDate,
					contractEndDate: contractDraft.contractEndDate,
					contractTerm: contractDraft.contractTerm,
					roomId: contractDraft.room,
					depositReceiptId: contractDraft.depositReceiptId,
					depositId: contractDraft.depositId ?? null,
				},
				session,
			);
			if (!contractCreated) throw new InternalError('Có lỗi trong quá trình tạo hợp đồng');

			await Services.rooms.bumpRoomVersionBlind(contractDraft.room, session);

			result = {
				buildingId: currentRoom.building,
				contractId: contractCreated._id,
				roomId: contractDraft.room,
				contractSignDate: contractCreated.contractSignDate,
				contractEndDate: contractCreated.contractEndDate,
				contractTerm: contractCreated.contractTerm,
				depositAmount: contractDraft.depositAmount,
				rent: contractDraft.rent,
				feesData,
				interiors: contractDraft.interiors ?? [],
			};
			return result;
		});
		return result;
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

// exports.createContract = async (contractDraftId) => {
// 	let session;
// 	try {
// 		const roomObjectId = mongoose.Types.ObjectId(data.roomId);

// 		session = await mongoose.startSession();
// 		await session.withTransaction(async () => {
// 			const contractDraft = await Services.contracts.getContractDraftById(contractDraftId, session);

// 			const currentRoom = await Entity.RoomsEntity.findOne({ _id: contractDraft.room }).session(session);
// 			if (!currentRoom) throw new NotFoundError(`Phòng không tồn tại`);

// 			currentRoom.roomPrice = contractDraft.rent;
// 			currentRoom.roomDeposit = contractDraft.depositAmount;
// 			currentRoom.roomState = 1;
// 			currentRoom.interior = contractDraft.interiors;
// 			currentRoom.isDeposited = false;
// 			await currentRoom.save({ session });

// 			const contractCreated = await Services.contracts.generateContract(
// 				{
// 					rent: contractDraft.rent,
// 				},
// 				session,
// 			);
// 		});
// 	} catch (error) {
// 		throw error;
// 	} finally {
// 		if (session) session.endSession();
// 	}
// };

exports.getContractPdfSignedUrl = async (contractCode) => {
	const contractPdfUrf = await Services.contracts.getContractPdfUrl(contractCode);
	return contractPdfUrf;
};

exports.setExpectedMoveOutDate = async (contractId, expectedMoveOutDate) => {
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const contractObjectId = mongoose.Types.ObjectId(contractId);

		const currentContract = await Services.contracts.getContractById(contractObjectId, session);

		const normalize = (d) => new Date(new Date(d).setHours(0, 0, 0, 0));

		const moveOut = normalize(expectedMoveOutDate);
		const contractEnd = normalize(currentContract.contractEndDate);

		const diffDays = (contractEnd - moveOut) / (1000 * 60 * 60 * 24);

		// ====== Nếu trả phòng sớm hơn >= 31 ngày ======
		const isEarlyTermination = diffDays >= 31;

		currentContract.expectedMoveOutDate = expectedMoveOutDate;
		currentContract.isEarlyTermination = isEarlyTermination;

		await Entity.RoomsEntity.findOneAndUpdate({ _id: currentContract.room }, { $set: { roomState: 2 } }, { session });
		await currentContract.save({ session });
		await session.commitTransaction();
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.terminateContractUnRefund = async (contractId) => {
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const contractObjectId = mongoose.Types.ObjectId(contractId);

		const currentContract = await Entity.ContractsEntity.findOne({ _id: contractObjectId }).exec();
		if (!currentContract) throw new NotFoundError(`Hợp đồng với không tồn tại`);
		const { room } = currentContract;
		const updateRoomState = await Entity.RoomsEntity.findOneAndUpdate({ _id: room }, { $set: { status: 0 } }, { session });
		if (!updateRoomState) throw new NotFoundError(`Phòng không tồn tại`);

		const updateCustomers = await Entity.CustomersEntity.updateMany(
			{ room: room, status: { $in: [1, 2] } },
			{ $set: { status: 0 } },
			{ session },
		);
		const lockReceiptsUnpaid = await Entity.ReceiptsEntity.updateMany(
			{ room: room, status: { $in: ['unpaid', 'partial'] } },
			{ $set: { locked: true } },
			{ session },
		);
		const lockInvoiceUnpaid = await Entity.InvoicesEntity.findOneAndUpdate(
			{ room: room, status: { $in: ['unpaid', 'partial'] } },
			{ $set: { locked: true } },
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

exports.cancelIsEarlyTermination = async (contractId, roomId) => {
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const checkIsExistDeposit = await Entity.RoomsEntity.findOne({
			room: roomId,
			status: { $nin: ['close', 'cancelled', 'pending'] },
		}).session(session);
		if (checkIsExistDeposit) throw new BadRequestError('Phòng đã được đặt cọc');

		const updateContract = await Entity.ContractsEntity.findOneAndUpdate(
			{ _id: contractId },
			{ $set: { isEarlyTermination: false, expectedMoveOutDate: null } },
			{ new: true, session },
		);
		if (!updateContract) throw new NotFoundError(`Hợp đồng với không tồn tại`);

		await Entity.RoomsEntity.findOneAndUpdate({ _id: roomId }, { $set: { roomState: 1 } }, { session });

		await session.commitTransaction();
		return 'Success';
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		if (session) session.endSession();
	}
};
