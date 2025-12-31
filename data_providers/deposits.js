const mongoose = require('mongoose');
const Entity = require('../models');
const listFees = require('../utils/getListFeeInital');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { NotFoundError, BadRequestError } = require('../AppError');
const Pipelines = require('../service/aggregates');
const Services = require('../service');
const { depositStatus } = require('../constants/deposits');

exports.getDeposits = async (buildingId) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const deposits = Services.deposits.getDeposits(buildingObjectId);
	return deposits;
};

exports.createDeposit = async (data) => {
	let session;
	let result;
	try {
		const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);
		const roomObjectId = new mongoose.Types.ObjectId(data.roomId);
		const receiptObjectId = new mongoose.Types.ObjectId(data.receiptId);

		const { room, customer } = data;
		// Khởi tạo transaction
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const depositReceipt = await Services.receipts.findById(data.receiptId).session(session).lean().exec();

			if (!depositReceipt) {
				throw new BadRequestError(`Hóa đơn đặt cọc chưa được khởi tạo !`);
			} else if (depositReceipt.paidAmount === 0) {
				throw new BadRequestError(`Hóa đơn đặt cọc chưa thanh toán !`);
			}

			const { transactions, paidAmount } = depositReceipt;

			const getInitialFeesByFeeKey = () => {
				if (!Array.isArray(data?.fees) || !Array.isArray(listFees)) return [];

				// Tạo Map để tra nhanh theo feeKey
				const feeMap = new Map(listFees.map((fee) => [fee.feeKey, fee]));

				const fees = [];
				for (const feeItem of data.fees) {
					const match = feeMap.get(feeItem.feeKey);
					if (match) {
						if (match.unit === 'index') {
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

				return fees;
			};

			const getDepositStatus = () => {
				if (paidAmount >= room.depositAmount) return depositStatus['PAID'];
				else if (paidAmount < room.depositAmount) return depositStatus['PARTIAL'];
			};

			const [newDeposit] = await Entity.DepositsEntity.create(
				[
					{
						room: roomObjectId,
						building: buildingObjectId,
						receipt: receiptObjectId,
						status: getDepositStatus(),
						rent: room.rent,
						depositAmount: room.depositAmount,
						actualDepositAmount: paidAmount,
						depositCompletionDate: room.depositCompletionDate,
						checkinDate: room.checkinDate,
						rentalTerm: room.rentalTerm,
						numberOfOccupants: room.numberOfOccupants,
						customer: customer,
						fees: getInitialFeesByFeeKey(),
						interiors: data.interiors,
					},
				],
				{ session },
			);

			await Services.rooms.setRoomDeposited({ roomId: data.roomId, isDeposited: true, session });

			result = newDeposit.toObject();
			return 'Success';
		});
		return result;
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.getDepositDetail = async (depositId) => {
	const depositObjectId = new mongoose.Types.ObjectId(depositId);

	const [depositDetail] = await Entity.DepositsEntity.aggregate(Pipelines.deposits.getDepositDetail(depositObjectId));
	if (!depositDetail) throw new NotFoundError('Dữ liệu không tồn tại');

	return depositDetail;
};

exports.modifyDeposit = async (data) => {
	let session;
	try {
		const depositObjectId = new mongoose.Types.ObjectId(data.depositId);

		const { room, customer } = data;
		// Khởi tạo transaction
		session = await mongoose.startSession();
		session.startTransaction();

		const currentDeposit = await Entity.DepositsEntity.aggregate([
			{
				$match: {
					_id: depositObjectId,
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: 'room',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								_id: 1,
								roomIndex: 1,
							},
						},
					],
					as: 'roomInfo',
				},
			},
			{
				$lookup: {
					from: 'receipts',
					localField: 'receipt',
					foreignField: '_id',
					as: 'receipts',
				},
			},
			{
				$lookup: {
					from: 'transactions',
					localField: 'receipts._id',
					foreignField: 'receipt',
					as: 'transactions',
				},
			},
		]);
		console.log('log of currentDeposit: ', currentDeposit);

		if (currentDeposit.length === 0) {
			throw new Error(`không tìm thấy thông tin cọc ${data.depositId}`);
		}
		const { receipts } = currentDeposit[0];
		console.log('log of receipts: ', receipts[0]._id);

		// create new Receipt if depositAmount raise
		let currentDepositAmount = currentDeposit[0].depositAmount;
		const shouldModifyDepositReceipt = currentDepositAmount !== room.depositAmount;
		console.log('log of shouldModifyDepositReceipt: ', shouldModifyDepositReceipt);

		let depositNewStatus;
		let receiptPaidAmount = 0;
		if (shouldModifyDepositReceipt) {
			const { transactions } = currentDeposit[0];

			if (transactions?.length > 0) {
				receiptPaidAmount = transactions?.reduce((sum, item) => sum + item.amount, 0);
			} else receiptPaidAmount = 0;

			let getReceiptStatus = () => {
				if (receiptPaidAmount === 0) {
					return 'unpaid';
				} else if (room.depositAmount > receiptPaidAmount) {
					return 'partial';
				} else if (room.depositAmount <= receiptPaidAmount) {
					return 'paid';
				}
			};
			depositNewStatus = getReceiptStatus();

			// Terminate old receipt
			const modifyReceipt = await Entity.ReceiptsEntity.findOneAndUpdate(
				{ _id: receipts[0]?._id },
				{
					status: depositNewStatus,
					amount: room.depositAmount,
				},
			).session(session);

			// Generate new depositReceipt
			// let newDepositAmount = Math.max(room.depositAmount - receiptPaidAmount, 0);
			// const [newDepositReceipt] = await Entity.ReceiptsEntity.create(
			// 	[
			// 		{
			// 			amount: room.depositAmount,
			// 			receiptContent: `Tiền cọc phòng ${currentDeposit[0].roomInfo[0]?.roomIndex ?? 'N/A'}`,
			// 			status: depositNewStatus,
			// 			room: currentDeposit[0].room,
			// 			paymentContent: generatePaymentContent(),
			// 			locked: 'false',
			// 			payer: customer.fullName ?? '',
			// 			receiptType: 'deposit',
			// 		},
			// 	],
			// 	{ session: session },
			// );
			console.log('log of modifyReceipt: ', modifyReceipt);
		}

		const getInitialFeesByFeeKey = () => {
			let fees = [];
			for (const feeItem of data.fees) {
				const normalize = (str) => str?.toString().trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
				const findFeeMatch = listFees.find((fee) => normalize(fee.feeKey) === normalize(feeItem.feeKey));
				if (findFeeMatch) {
					if (findFeeMatch.unit === 'index') {
						fees.push({ ...findFeeMatch, feeAmount: feeItem.feeAmount, lastIndex: feeItem.lastIndex });
					} else {
						fees.push({ ...findFeeMatch, feeAmount: feeItem.feeAmount });
					}
				}
			}
			return fees;
		};

		const formatInteriors = () => {
			if (data.interiors?.length > 0) {
				return data.interiors.map((i) => ({
					interiorName: i.interiorName,
					interiorRentalDate: i.interiorRentalDate ?? new Date(),
					quantity: i.quantity,
				}));
			} else return [];
		};

		await Entity.DepositsEntity.findOneAndUpdate(
			{
				_id: depositObjectId,
			},
			{
				fees: getInitialFeesByFeeKey(),
				customer: customer,
				interiors: formatInteriors(),
				status: !shouldModifyDepositReceipt ? currentDeposit[0].status : depositNewStatus,
				rent: room.rent,
				depositAmount: room.depositAmount,
				actualDepositAmount: !shouldModifyDepositReceipt ? currentDeposit[0].actualDepositAmount : receiptPaidAmount,
				checkinDate: room.checkinDate,
				depositCompletionDate: room.depositCompletionDate,
				rentalTerm: room.rentalTerm,
				numberOfOccupants: room.numberOfOccupants,
			},
		).session(session);
		await session.commitTransaction();
		return 'Success';
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.terminateDeposit = async (depositId, version) => {
	let session;
	try {
		// Khởi tạo transaction
		session = await mongoose.startSession();
		return session.withTransaction(async () => {
			const deposit = await Entity.DepositsEntity.findById(depositId).session(session).lean().exec();
			if (!deposit) NotFoundError('Dữ liệu đặt cọc không tồn tại');

			const currentPeriod = await getCurrentPeriod(deposit.building);
			const { currentMonth: month, currentYear: year } = currentPeriod;

			await Services.deposits.cancelledDeposit(depositId, version, session);

			await Entity.ReceiptsEntity.updateOne({ _id: deposit.receipt }, { $set: { month, year, locked: true } }, { session });

			await Services.rooms.setRoomDeposited({ roomId: deposit.room, isDeposited: false, session });

			return 'Success';
		});
	} finally {
		if (session) session.endSession();
	}
};

exports.uploardDepositTerm = async (data) => {
	const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);
	const buildingInfo = await Entity.BuildingsEntity.exists({ _id: buildingObjectId });
	if (!buildingInfo) throw new NotFoundError(`Tòa nhà với Id: ${buildingObjectId} không tồn tại !`);
};

//================ UN REFACTORED ================//

exports.getDepositDetailByRoomId = async (data, cb, next) => {
	try {
		const roomObjectId = new mongoose.Types.ObjectId(data.roomId);

		const depositDetail = await Entity.DepositsEntity.aggregate([
			{
				$match: {
					room: roomObjectId,
					status: {
						$nin: ['cancelled', 'close'],
					},
				},
			},
			{
				$lookup: {
					from: 'receipts',
					localField: 'receipt',
					foreignField: '_id',
					as: 'receiptInfo',
				},
			},
			{
				$unwind:
					/**
					 * path: Path to the array field.
					 * includeArrayIndex: Optional name for index.
					 * preserveNullAndEmptyArrays: Optional
					 *   toggle to unwind null and empty values.
					 */
					{
						path: '$receiptInfo',
						preserveNullAndEmptyArrays: true,
					},
			},
			{
				$lookup: {
					from: 'transactions',
					localField: 'receiptInfo._id',
					foreignField: 'receipt',
					as: 'transactions',
				},
			},

			{
				$unwind: {
					path: '$transactions',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: 'users',
					let: {
						collectorId: '$transactions.collector',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$collectorId'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								fullName: 1,
							},
						},
					],
					as: 'collectorInfo',
				},
			},
			{
				$set: {
					'transactions.collector': {
						$ifNull: [
							{
								$arrayElemAt: ['$collectorInfo', 0],
							},
							null,
						],
					},
				},
			},
			{
				$group: {
					_id: '$_id',
					deposit: {
						$first: {
							room: '$room',
							building: '$building',
							status: '$status',
							rent: '$rent',
							depositAmount: '$depositAmount',
							actualDepositAmount: '$actualDepositAmount',
							checkinDate: '$checkinDate',
							rentalTerm: '$rentalTerm',
							numberOfOccupants: '$numberOfOccupants',
							depositCompletionDate: '$depositCompletionDate',
							customer: '$customer',
							fees: '$fees',
							interiors: '$interiors',
							receiptInfo: '$receiptInfo',
						},
					},
					transactions: {
						$push: '$transactions',
					},
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: 'deposit.room',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								roomIndex: 1,
							},
						},
					],
					as: 'roomInfo',
				},
			},
			{
				$lookup: {
					from: 'buildings',
					localField: 'deposit.building',
					foreignField: '_id',
					as: 'buildingInfo',
				},
			},
			{
				$addFields: {
					roomInfo: {
						$arrayElemAt: ['$roomInfo', 0],
					},
					buildingInfo: {
						$arrayElemAt: ['$buildingInfo', 0],
					},
				},
			},
			{
				$project: {
					_id: '$deposit._id',
					status: '$deposit.status',
					interiors: '$deposit.interiors',
					fees: '$deposit.fees',
					receiptIds: '$deposit.receipts',
					transactions: 1,
					room: {
						_id: '$roomInfo._id',
						roomIndex: '$roomInfo.roomIndex',
						rent: '$deposit.rent',
						depositAmount: '$deposit.depositAmount',
						actualDepositAmount: '$deposit.actualDepositAmount',
						depositCompletionDate: '$deposit.depositCompletionDate',
						checkinDate: '$deposit.checkinDate',
						rentalTerm: '$deposit.rentalTerm',
					},
					building: {
						_id: '$buildingInfo._id',
						buildingName: '$buildingInfo.buildingName',
						buildingAddress: '$buildingInfo.buildingAddress',
					},
					customer: {
						$mergeObjects: [
							'$deposit.customer',
							{
								numberOfOccupants: '$deposit.numberOfOccupants',
							},
						],
					},
				},
			},
		]);

		if (!depositDetail[0]) cb(null, null);
		else cb(null, depositDetail[0]);
	} catch (error) {
		next(error);
	}
};
