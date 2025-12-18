const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const generateContract = require('../utils/generateContract');
const listFeeInitial = require('../utils/getListFeeInital');
const { NotFoundError, BadRequestError, InternalError } = require('../AppError');
const generateContractCode = require('../utils/generateContractCode');
const Services = require('../service');

exports.generateContract = async (data) => {
	let session;
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		session = await mongoose.startSession();
		session.startTransaction();

		const currentRoom = await Entity.RoomsEntity.findOne({ _id: roomObjectId }).session(session);
		if (!currentRoom) throw new NotFoundError(`Phòng không tồn tại`);

		currentRoom.roomPrice = data.rent;
		currentRoom.roomDeposit = data.depositAmount;
		currentRoom.roomState = 1;
		currentRoom.interior = data.interiors;
		currentRoom.isDeposited = false;
		await currentRoom.save({ session });

		let customersData = data.customers?.map((cus, index) => {
			return {
				fullName: cus.fullName,
				gender: cus.gender,
				isContractOwner: index === 0 ? true : false,
				birthday: cus.dob,
				permanentAddress: cus.address,
				phone: cus.phone,
				avatar: '',
				cccd: cus.cccd,
				cccdIssueDate: cus.cccdIssueDate,
				cccdIssueAt: cus.cccdIssueAt,
				status: 1,
				room: roomObjectId,
				temporaryResidence: false,
				checkinDate: new Date(),
				checkoutDate: data.contractEndDate,
			};
		});

		const createdCustomers = await Entity.CustomersEntity.insertMany(customersData, { session });

		const phoneToCustomerIdMap = new Map();
		for (const customer of createdCustomers) {
			phoneToCustomerIdMap.set(customer.phone, customer._id);
		}

		if (data.vehicle && data.vehicles?.length > 0) {
			const vehicleData = data.vehicles
				?.map((vehicle) =>
					vehicle.licensePlate?.trim()
						? {
								licensePlate: vehicle.licensePlate,
								fromDate: new Date(),
								owner: phoneToCustomerIdMap.get(vehicle.ownerPhone) || null,
								image: '',
								room: roomObjectId,
								status: 'active',
						  }
						: null,
				)
				.filter(Boolean);
			await Entity.VehiclesEntity.insertMany(vehicleData, { session });
		}

		await Entity.FeesEntity.deleteMany({ room: roomObjectId }, { session });
		const feesData = data.fees
			?.map((fee) => {
				const intialFee = listFeeInitial.find((f) => f.feeKey === fee.feeKey);
				if (!intialFee) return null;

				return {
					feeName: intialFee.feeName,
					feeAmount: fee.feeAmount,
					unit: intialFee.unit,
					lastIndex: intialFee.unit === 'index' ? fee.lastIndex : undefined,
					feeKey: intialFee.feeKey,
					iconPath: intialFee.iconPath,
					room: roomObjectId,
				};
			})
			.filter(Boolean); // lọc bỏ null nếu có
		await Entity.FeesEntity.insertMany(feesData, { session });

		// update depositReceiptType from deposit => incidental
		// await Entity.ReceiptsEntity.findOneAndUpdate({ _id: data.receiptId });

		if (data.depositId) {
			const depositObjectId = mongoose.Types.ObjectId(data.depositId);
			await Entity.DepositsEntity.updateOne(
				{
					_id: depositObjectId,
					version: data.depositVersion,
				},
				{ $set: { status: 'close' } },
				{ session },
			);
		}

		const [createContract] = await Entity.ContractsEntity.create(
			[
				{
					createdAt: new Date(),
					fees: feesData,
					rent: data.rent,
					contractSignDate: data.contractSignDate,
					contractEndDate: data.contractEndDate,
					contractTerm: data.contractTerm,
					status: 'active',
					room: roomObjectId,
					contractCode: contractCode,
					depositReceiptId: data.receipt,
					depositId: data.depositId ?? null,
				},
			],
			{ session },
		);
		if (!createContract) throw new InternalError('Có lỗi trong quá trình tạo hợp đồng');

		await session.commitTransaction();

		return {
			buildingId: data.buildingId,
			contractId: createContract._id,
			roomId: data.roomId,
			contractSignDate: data.contractSignDate,
			contractEndDate: data.contractEndDate,
			contractTerm: data.contractTerm,
			depositAmount: data.depositAmount,
			rent: data.rent,
			feesData,
			interiors: data.interiors ?? [],
		};
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

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
