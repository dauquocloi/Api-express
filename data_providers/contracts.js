const mongoose = require('mongoose');
const Entity = require('../models');
const listFeeInitial = require('../utils/getListFeeInital');
const { NotFoundError, BadRequestError, InternalError, ConflictError } = require('../AppError');
const { contractJob } = require('../jobs/contract/contract.job');
const { GENERATE_CONTRACT } = require('../jobs/constant/jobNames');
const Services = require('../service');
const { calculateTotalFeeAmount } = require('../utils/calculateFeeTotal');
const { generateInvoiceFeesFromReq } = require('../service/invoices.helper');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const getFieldUrl = require('../utils/getFileUrl');
const { client: redis } = require('../config').redisDb;
const { roomState, invoiceStatus, invoiceType, feeUnit, receiptTypes, receiptStatus, depositStatus } = require('../constants');
const { compareFees, getChangedFeeIndexes } = require('../service/fees.helper');
const { processImportCustomersAndVehicles, formatInitialFees } = require('./contracts.util');

exports.prepareGenerateContract = async (data) => {
	const {
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
	} = data;

	const currentRoom = await Services.rooms.findById(roomId).lean().exec();
	if (currentRoom.roomState !== roomState['UN_HIRED']) throw new BadRequestError('Bạn không thể tạo hợp đồng mới cho phòng đang thuê !');

	const currentPeriod = await getCurrentPeriod(buildingId);

	const getRoomFees = formatInitialFees(fees);

	let formatRoomFees = [];
	if (getRoomFees.length > 0) {
		formatRoomFees = generateInvoiceFeesFromReq(getRoomFees, finance.rent, stayDays);
	}
	const totalInvoice = calculateTotalFeeAmount(formatRoomFees);
	console.log('formatRoomFees: ', formatRoomFees);

	const firstInvoice = await Services.invoices.createInvoice({
		roomId: currentRoom._id,
		listFees: formatRoomFees,
		totalInvoiceAmount: totalInvoice,
		stayDays: stayDays,
		debtInfo: null,
		currentPeriod: currentPeriod,
		payerName: customers[0]?.fullName ?? '',
		creater: createrId,
		initialStatus: invoiceStatus['PENDING'],
		invoiceType: invoiceType['FIRST_INVOICE'],
	});

	const existedDeposit = await Services.deposits.findDepositByRoomId(roomId).lean().exec();
	console.log('log of existedDeposit: ', existedDeposit);
	let depositReceiptId;
	if (!existedDeposit) {
		const createDepositReceipt = await Services.receipts.createReceipt({
			roomObjectId: roomId,
			receiptAmount: finance.depositAmount,
			payer: customers[0]?.fullName ?? '',
			currentPeriod: currentPeriod,
			receiptContent: `Tiền cọc phòng ${currentRoom.roomIndex}`,
			receiptType: receiptTypes['DEPOSIT'],
			initialStatus: receiptStatus['PENDING'],
			creater: createrId,
		});
		depositReceiptId = createDepositReceipt._id;
	} else {
		depositReceiptId = existedDeposit.receipt;
		await Services.receipts.modifyDepositReceipt({
			receiptObjectId: existedDeposit.receipt,
			receiptAmount: finance.depositAmount,
		});
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

	const contractDraft = await Services.contracts.createContractDraft(contractDraftData);

	await Services.rooms.bumpRoomVersionBlind(roomId);

	const result = {
		contractDraftId: contractDraft._id,
		invoiceId: firstInvoice._id,
		receiptId: depositReceiptId,
	};
	console.log('log of result from prepareGenerateContract: ', result);
	throw new InternalError('StopForTesting');
	return result;
};

exports.generateContract = async (contractDraftId, userId) => {
	const contractDraft = await Services.contracts.getContractDraftById(contractDraftId).populate('depositReceiptId').lean().exec();
	if (!contractDraft) throw new NotFoundError('Dữ liệu không tồn tại !');
	const contractInvoice = await Services.invoices.findById(contractDraft.firstInvoiceId).lean().exec();

	if (!contractInvoice) throw new NotFoundError('Hóa đơn tiền nhà không tồn tại');
	if (contractInvoice.status === invoiceStatus['PENDING'] || contractInvoice.status === invoiceStatus['UNPAID']) {
		throw new BadRequestError('Cần thanh toán hóa đơn tiền nhà trước khi tạo hợp đồng');
	}

	const updateRoom = await Services.rooms.updateRoomByGenerateContract({
		roomId: contractDraft.room,
		roomPice: contractDraft.rent,
		roomDeposit: contractDraft.depositAmount,
		interiors: contractDraft.interiors,
		version: contractDraft.version,
	});

	// should not delete all
	// await Entity.FeesEntity.deleteMany({ room: contractDraft.room }, { session });
	const currentRoomFees = await Services.fees.findByRoomId(contractDraft.room).lean().exec();

	const { feesToUpdate, feesToCreate, feesToRemove } = compareFees(currentRoomFees, contractDraft.fees);
	console.log('Log of comparison: ', feesToUpdate, feesToCreate, feesToRemove);

	const changedFeeIndexes = getChangedFeeIndexes(currentRoomFees, contractDraft.fees);
	console.log('log of changedFeeIndexes: ', changedFeeIndexes);
	if (changedFeeIndexes.size > 0) {
		const feeIndexRecordsGenerated = await createFeeIndexRecordsFromChangedFees({
			changedFeeMap: changedFeeIndexes,
			editorId: userId,
			roomId: contractDraft.room,
			fromSource: UPDATE_FEE_INDEX_SOURCE['MODIFY_INVOICE'],
		});
		console.log('feeIndexRecordsGenerated: ', feeIndexRecordsGenerated);
	}
	await Services.fees.generateAndUpdateFees({ feesToCreate, feesToUpdate, feesToRemove, roomId: contractDraft.room });

	if (contractDraft.depositId) {
		await Services.deposits.closeDeposit({ depositId: contractDraft.depositId });
	}

	const feeInitialMaps = new Map(listFeeInitial.map((fee) => [fee.feeKey, fee]));
	const formatContractFeesData = contractDraft.fees.map((fee) => ({
		feeAmount: fee.feeAmount,
		feeKey: fee.feeKey,
		unit: feeInitialMaps.get(fee.feeKey).unit,
		iconPath: feeInitialMaps.get(fee.feeKey).iconPath,
		feeName: feeInitialMaps.get(fee.feeKey).feeName,
	}));
	const contractCreated = await Services.contracts.generateContract({
		rent: contractDraft.rent,
		roomFees: formatContractFeesData,
		contractSignDate: contractDraft.contractSignDate,
		contractEndDate: contractDraft.contractEndDate,
		contractTerm: contractDraft.contractTerm,
		roomId: contractDraft.room,
		depositId: contractDraft.depositId ?? null,
		depositAmount: contractDraft.depositAmount,
		depositReceiptId: contractDraft.depositReceiptId,
	});

	const { _id: depositReceiptId, status: currentReceiptStatus } = contractDraft.depositReceiptId;
	if (!depositReceiptId) throw new NotFoundError(`Hóa đơn đặt cọc không tồn tại !`);

	await Services.receipts.setContractId({
		receiptId: contractDraft.depositReceiptId._id,
		status: currentReceiptStatus === receiptStatus['PENDING'] ? receiptStatus['UNPAID'] : null,
		contractId: contractCreated._id,
	});

	await Services.invoices.setContractId({ invoiceId: contractDraft.firstInvoiceId, contractId: contractCreated._id });

	// let vehiclesWithoutOwner = [];
	// let customersData = contractDraft.customers?.map((cus, index) => {
	// 	if (cus.vehicleLicensePlate && cus.vehicleLicensePlate?.trim() !== '') {
	// 		vehiclesWithoutOwner.push({
	// 			licensePlate: cus.vehicleLicensePlate,
	// 			phone: cus.phone,
	// 			index: index,
	// 		});
	// 	}
	// 	return {
	// 		fullName: cus.fullName,
	// 		gender: cus.sex.toLowerCase(),
	// 		isContractOwner: index === 0 ? true : false,
	// 		birthdate: cus.dob,
	// 		permanentAddress: cus.address,
	// 		phone: cus.phone,
	// 		avatar: '',
	// 		cccd: cus.cccd,
	// 		cccdIssueDate: cus.cccdIssueDate,
	// 		cccdIssueAt: cus.cccdIssueAt,
	// 		status: 1,
	// 		room: contractDraft.room,
	// 		temporaryResidence: false,
	// 		checkinDate: new Date(),
	// 		checkoutDate: contractDraft.contractEndDate,
	// 		contract: contractCreated._id,
	// 	};
	// });

	// const createdCustomers = await Entity.CustomersEntity.insertMany(customersData, { session });
	// let ownerId = createdCustomers.filter((c) => c.isContractOwner === true)[0]?._id;
	// await Services.contracts.importCustomerRef(contractCreated._id, ownerId, session);

	// if (vehiclesWithoutOwner?.length > 0) {
	// 	const customerMap = {};
	// 	createdCustomers.forEach((customer) => {
	// 		customerMap[customer.phone] = customer._id;
	// 	});

	// 	const vehicles = vehiclesWithoutOwner.map((vehicleData) => ({
	// 		licensePlate: vehicleData.licensePlate,
	// 		fromDate: new Date(),
	// 		owner: customerMap[vehicleData.phone], // _id của customer sở hữu
	// 		image: '',
	// 		room: contractCreated.room,
	// 		status: 'active',
	// 		contract: contractCreated._id,
	// 	}));

	// 	await Entity.VehiclesEntity.insertMany(vehicles, { session });
	// }

	await processImportCustomersAndVehicles({
		customers: contractDraft.customers,
		contractEndDate: contractDraft.contractEndDate,
		contractId: contractCreated._id,
		roomId: contractDraft.room,
	});

	await Services.rooms.bumpRoomVersionBlind(contractDraft.room, session);
	await Services.rooms.unLockedRoom(contractDraft.room, session);

	result = {
		buildingId: updateRoom.building,
		contractId: contractCreated._id,
		contractSignDate: contractCreated.contractSignDate,
		contractEndDate: contractCreated.contractEndDate,
		contractTerm: contractCreated.contractTerm,
		depositAmount: contractDraft.depositAmount,
		rent: contractDraft.rent,
		feesData,
		interiors: contractDraft.interiors ?? [],
	};

	throw new InternalError('Stop for testing');

	await contractJob({ contractId: contractCreated._id, buildingId: updateRoom.building, type: GENERATE_CONTRACT });
	return result;
};

exports.getContractPdfSignedUrl = async (contractCode) => {
	const contractPdfUrf = await Services.contracts.getContractPdfUrl(contractCode);
	return contractPdfUrf;
};

exports.setExpectedMoveOutDate = async (data) => {
	const { contractId, expectedMoveOutDate, userId } = data;

	const contractObjectId = new mongoose.Types.ObjectId(contractId);

	const currentContract = await Services.contracts.findById(contractObjectId);
	if (!currentContract) throw new NotFoundError('Hợp đồng không tồn tại !');

	await Services.rooms.assertRoomWritable({ roomId: currentContract.room, userId });

	const normalize = (d) => new Date(new Date(d).setHours(0, 0, 0, 0));

	const moveOut = normalize(expectedMoveOutDate);
	const contractEnd = normalize(currentContract.contractEndDate);

	const diffDays = (contractEnd - moveOut) / (1000 * 60 * 60 * 24);

	// ====== Nếu trả phòng sớm hơn >= 31 ngày ======
	const isEarlyTermination = diffDays >= 31;

	currentContract.expectedMoveOutDate = expectedMoveOutDate;
	currentContract.isEarlyTermination = isEarlyTermination;

	await Services.rooms.updateRoomState({ roomId: currentContract.room, roomState: roomState['ABOUT_CHECKOUT'] });
	await currentContract.save();

	throw new InternalError('Stop for testing');

	return {
		_id: currentContract._id,
		isEarlyTermination,
		expectedMoveOutDate: currentContract.expectedMoveOutDate,
	};
};

// exports.terminateContractUnRefund = async (contractId, redisKey) => {
// 	let session;
// 	try {
// 		session = await mongoose.startSession();
// 		session.startTransaction();

// 		const contractObjectId = new mongoose.Types.ObjectId(contractId);

// 		const currentContract = await Entity.ContractsEntity.findOne({ _id: contractObjectId }).exec();
// 		if (!currentContract) throw new NotFoundError(`Hợp đồng với không tồn tại`);
// 		const { room } = currentContract;
// 		const updateRoomState = await Entity.RoomsEntity.findOneAndUpdate({ _id: room }, { $set: { status: 0 } }, { session });
// 		if (!updateRoomState) throw new NotFoundError(`Phòng không tồn tại`);

// 		const updateCustomers = await Entity.CustomersEntity.updateMany(
// 			{ room: room, status: { $in: [1, 2] } },
// 			{ $set: { status: 0 } },
// 			{ session },
// 		);
// 		const lockReceiptsUnpaid = await Entity.ReceiptsEntity.updateMany(
// 			{ room: room, status: { $in: ['unpaid', 'partial'] } },
// 			{ $set: { locked: true } },
// 			{ session },
// 		);
// 		const lockInvoiceUnpaid = await Entity.InvoicesEntity.findOneAndUpdate(
// 			{ room: room, status: { $in: ['unpaid', 'partial'] } },
// 			{ $set: { locked: true } },
// 			{ session },
// 		);

// 		await session.commitTransaction();

// 		await redis.set(redisKey, `SUCCESS:${JSON.stringify({})}`, 'EX', process.env.REDIS_EXP_SEC);
// 		return 'Success';
// 	} catch (error) {
// 		await redis.set(redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
// 		if (session) await session.abortTransaction();
// 		throw error;
// 	} finally {
// 		if (session) session.endSession();
// 	}
// };

exports.cancelIsEarlyTermination = async (contractId, roomId) => {
	const checkIsExistDeposit = await Services.deposits.findDepositByRoomId(roomId).lean().exec();
	if (checkIsExistDeposit) throw new ConflictError('Phòng đã được đặt cọc !');

	const updateContract = await Services.contracts.cancelEarlyTermination({ contractId });

	await Services.rooms.updateRoomState({ roomId: roomId, roomState: roomState['HIRED'] });

	throw new InternalError('Stop for testing');

	return updateContract;
};

// should done this:
exports.contractExtention = async (data) => {
	const { contractId, extensionDate, contractSignDate, newRent, newDepositAmount, userId, contractTerm, version } = data;

	const currentContract = await Services.contracts.findById(contractId).populate('room').lean().exec();
	if (!currentContract) throw new NotFoundError('Hợp đồng không tồn tại');
	if (currentContract.room.roomState === roomState['UN_HIRED']) throw new BadRequestError('Trạng thái phòng không hợp lệ');

	await Services.rooms.assertRoomWritable({ roomId: currentContract.room._id, userId });

	const lastestContractVersion = currentContract.versions.reduce((sum, v) => (v.version > sum.version ? v : sum));
	console.log('log of lastestContractVersion: ', lastestContractVersion);

	if (new Date(extensionDate).getTime() < new Date(lastestContractVersion.contractEndDate).getTime()) {
		throw new BadRequestError('Ngày kết thúc không được bé hơn ngày hiện tại');
	}
	if (version !== currentContract.version) throw new ConflictError('Dữ liệu của hợp đồng đã bị thay đổi !');

	await Services.contracts.contractExtention({
		contractId: contractId,
		newContractEndDate: extensionDate,
		newContractSignDate: contractSignDate,
		newRent: newRent,
		version: version,
		depositAmount: newDepositAmount,
		contractTerm: contractTerm,
	});

	throw new InternalError('Stop for testing');
	return;
};

exports.getContractPdfUrlByCustomerPhone = async (phoneNumber) => {
	const normalizePhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
	const currentCustomer = await Services.customers.findByPhone(normalizePhoneNumber).populate({ path: 'room', populate: 'building' }).lean().exec();
	if (!currentCustomer) throw new NotFoundError('Số điện thoại không khớp với bất kỳ khách nào trong hệ thống.');
	if (!currentCustomer.isContractOwner) throw new BadRequestError('Số điện thoại không phải của chủ hợp đồng. Vui lòng nhập số điện chủ hợp đồng.');

	const currentContract = await Services.contracts.findByCustomerId(currentCustomer._id).lean().exec();
	if (!currentContract) throw new NotFoundError('Không tìm thấy hợp đồng');
	const { versions } = currentContract;

	let contracts = [];
	for (const contract of versions) {
		let contractPdfUrl = null;
		if (!!contract.contractPdfUrl) contractPdfUrl = await getFieldUrl(contract.contractPdfUrl);
		contracts.push({
			contractPdfUrl,
			_id: contract._id,
			status: contract.status,
			isCustomerConfirmed: contract.customerConfirmed,
			contractTerm: contract.contractTerm,
			contractSignDate: contract.contractSignDate,
			contractEndDate: contract.contractEndDate,
			rent: contract.rent,
			depositAmount: contract.depositAmount,
		});
	}

	return {
		contracts: contracts,
		fullName: currentCustomer.fullName,
		phone: currentCustomer.phone,
		temporaryResidence: currentCustomer.temporaryResidence,
		roomIndex: currentCustomer.room.roomIndex,
		buildingAddress: currentCustomer.room.building.buildingAddress,
	};
};

exports.getDebtsAndReceiptsUnpaid = async (contractId, userId) => {
	const currentContract = await Services.contracts.findById(contractId).lean().exec();
	if (!currentContract) throw new NotFoundError('Hợp đồng không tồn tại');
	await Services.rooms.setWriteLockedRoom(currentContract.room, null, userId);
	const result = await Services.contracts.getDebtsAndReceiptsUnpaid(contractId);
	return result;
};
