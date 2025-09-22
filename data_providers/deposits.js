const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const listFees = require('../utils/getListFeeInital');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { createDepositReceipt } = require('./receipts');
const generatePaymentContent = require('../utils/generatePaymentContent');

exports.createDeposit = async (data, cb, next) => {
	let session;
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const receiptObjectId = mongoose.Types.ObjectId(data.receiptId);

		const { room, customer } = data;
		// Khởi tạo transaction
		session = await mongoose.startSession();
		session.startTransaction();

		const checkReceipt = await Entity.ReceiptsEntity.aggregate([
			{
				$match: {
					_id: receiptObjectId,
				},
			},
			{
				$lookup: {
					from: 'transactions',
					localField: '_id',
					foreignField: 'receipt',
					as: 'transactions',
				},
			},
		]).session(session);

		console.log('log of checkReceipt: ', checkReceipt);

		if (checkReceipt.length === 0) {
			throw new Error(`Hóa đơn đặt cọc chưa được khởi tạo !`);
		} else if (checkReceipt[0]?.transactions?.length === 0) {
			throw new Error(`Hóa đơn đặt cọc: ${checkReceipt[0]._id} chưa có giao dịch !`);
		}

		const transactions = checkReceipt[0].transactions;
		const actualDepositAmount = [...transactions].reduce((sum, item) => item.amount + sum, 0);

		const getInitialFeesByFeeKey = () => {
			if (!Array.isArray(data?.fees) || !Array.isArray(listFees)) return [];

			// Tạo Map để tra nhanh theo feeKey
			const feeMap = new Map(listFees.map((fee) => [fee.feeKey, fee]));

			const fees = [];
			for (const feeItem of data.fees) {
				const match = feeMap.get(feeItem.feeKey);
				if (match) {
					if (feeItem.unit === 'index') {
						fees.push({ ...match, feeAmount: feeItem.feeAmount, lastIndex: feeItem?.lastIndex });
					} else {
						fees.push({ ...match, feeAmount: feeItem.feeAmount });
					}
				}
			}

			return fees;
		};

		const getDepositStatus = () => {
			if (actualDepositAmount === room.depositAmount || actualDepositAmount > room.depositAmount) return 'paid';
			else if (actualDepositAmount < room.depositAmount) return 'partial';
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
					actualDepositAmount: actualDepositAmount,
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

		const updateRoomState = await Entity.RoomsEntity.findOneAndUpdate({ _id: roomObjectId }, { isDeposited: true }).session(session);
		await session.commitTransaction();

		cb(null, newDeposit);
	} catch (error) {
		next(error);
	} finally {
		if (session) session.endSession();
	}
};

exports.getListDeposits = async (data, cb, next) => {
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const deposits = await Entity.DepositsEntity.aggregate([
			{
				$match: {
					building: buildingObjectId,
					status: {
						$ne: 'close',
					},
				},
			},
			{
				$lookup: {
					from: 'rooms',
					localField: 'room',
					foreignField: '_id',
					as: 'roomInfo',
				},
			},
			{
				$group: {
					_id: '$building',
					listDeposits: {
						$push: {
							roomId: '$room',
							depositAmount: '$depositAmount',
							status: '$status',
							roomIndex: {
								$getField: {
									field: 'roomIndex',
									input: {
										$arrayElemAt: ['$roomInfo', 0],
									},
								},
							},
							_id: '$_id',
						},
					},
				},
			},
		]);

		cb(null, deposits[0].listDeposits ?? []);
	} catch (error) {
		next(error);
	}
};

exports.getDepositDetail = async (data, cb, next) => {
	try {
		const depositObjectId = mongoose.Types.ObjectId(data.depositId);

		const depositDetail = await Entity.DepositsEntity.aggregate([
			{
				$match: {
					_id: depositObjectId,
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
				$lookup: {
					from: 'transactions',
					localField: 'receiptInfo._id',
					foreignField: 'receipt',
					as: 'transactions',
				},
			},
			{
				$lookup: {
					from: 'users',
					let: {
						collectorId: {
							$map: {
								input: '$transactions',
								as: 'trans',
								in: '$$trans.collector',
							},
						},
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$_id', '$$collectorId'],
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
				$lookup: {
					from: 'rooms',
					localField: 'room',
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
					localField: 'building',
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
					// Chỉ trả về một đối tượng receipt thỏa
					receiptInfo: {
						$arrayElemAt: [
							{
								$filter: {
									input: '$receiptInfo',
									as: 'receipt',
									cond: {
										$ne: ['$$receipt.status', 'cancelled'],
									},
								},
							},
							0,
						],
					},
					transactions: {
						$map: {
							input: '$transactions',
							as: 'tran',
							in: {
								$mergeObjects: [
									'$$tran',
									{
										collector: {
											$first: {
												$filter: {
													input: '$collectorInfo',
													as: 'cu',
													cond: {
														$eq: ['$$cu._id', '$$tran.collector'],
													},
												},
											},
										},
									},
								],
							},
						},
					},
				},
			},
			{
				$project: {
					_id: 1,
					status: 1,
					interiors: 1,
					fees: 1,
					transactions: 1,
					receiptInfo: 1,
					room: {
						_id: '$room',
						roomIndex: '$roomInfo.roomIndex',
						rent: '$rent',
						depositAmount: '$depositAmount',
						actualDepositAmount: '$actualDepositAmount',
						depositCompletionDate: '$depositCompletionDate',
						checkinDate: '$checkinDate',
						rentalTerm: '$rentalTerm',
					},
					building: {
						_id: '$buildingInfo._id',
						buildingName: '$buildingInfo.buildingName',
						buildingAddress: '$buildingInfo.buildingAddress',
					},
					customer: {
						$mergeObjects: [
							'$customer',
							{
								numberOfOccupants: '$numberOfOccupants',
							},
						],
					},
				},
			},
		]);

		if (depositDetail.length === 0) {
			throw new Error(`Không có dữ liệu đặt cọc ${data.depositObjectId}`);
		}

		cb(null, depositDetail[0]);
	} catch (error) {
		next(error);
	}
};

exports.getDepositDetailByRoomId = async (data, cb, next) => {
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);

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

exports.modifyDeposit = async (data, cb, next) => {
	let session;
	try {
		const depositObjectId = mongoose.Types.ObjectId(data.depositId);

		const { room, customer } = data;
		// Khởi tạo transaction
		session = await mongoose.startSession();
		session.startTransaction();

		const currentDeposit = await Entity.DepositsEntity.aggregate([
			{
				$match:
					/**
					 * query: The query in MQL.
					 */
					{
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
					interiorRentalDate: i.interiorRentalDate ?? '',
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
		cb(null, 'modified');
	} catch (error) {
		if (session) await session.abortTransaction();
		next(error);
	} finally {
		if (session) session.endSession();
	}
};

exports.terminateDeposit = async (data, cb, next) => {
	let session;
	try {
		const depositObjectId = mongoose.Types.ObjectId(data.depositId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const { currentMonth: month, currentYear: year } = currentPeriod;

		// Khởi tạo transaction
		session = await mongoose.startSession();
		session.startTransaction();

		const deposit = await Entity.DepositsEntity.findOne({ _id: depositObjectId }).session(session);
		if (!deposit) {
			throw new Error(`Thông tin cọc ${data.depositId} không tồn tại`);
		}

		// Thực hiện tuần tự trong transaction
		await Entity.DepositsEntity.updateOne({ _id: depositObjectId }, { $set: { status: 'terminated' } }, { session });

		await Entity.ReceiptsEntity.updateOne({ _id: deposit.receipt }, { $set: { month, year, locked: true } }, { session });

		await Entity.RoomsEntity.updateOne({ _id: deposit.room }, { $set: { isDeposited: false } }, { session });

		await session.commitTransaction();

		cb(null, 'success');
	} catch (error) {
		if (session) await session.abortTransaction();
		next(error);
	} finally {
		if (session) session.endSession();
	}
};
