const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const generatePaymentContent = require('../utils/generatePaymentContent');
const { AppError, NoEntryError, NotFoundError, BadRequestError, ConflictError, InternalError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const zaloService = require('../service/zalo.service');
const { getRoomFees } = require('../service/fees.service');
const Pipelines = require('../service/aggregates');
const Services = require('../service');
const { formatDebts } = require('../service/debts.helper');
const { calculateTotalFeeAmount } = require('../utils/calculateFeeTotal');
const { generateInvoiceFees } = require('../service/invoices.helper');
const { getInvoiceStatus } = require('../service/invoices.helper');

exports.getInvoicesPaymentStatus = async (buildingId, month, year) => {
	const buildingObjectId = mongoose.Types.ObjectId(buildingId);

	if (!month || !year) {
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		month = currentPeriod.currentMonth;
		year = currentPeriod.currentYear;
	}

	const listInvoicePaymentStatus = await Entity.BuildingsEntity.aggregate(
		Pipelines.invoices.getInvoicePaymentStatus(buildingObjectId, month, year),
	);

	return {
		currentPeriod: {
			currentMonth: Number(month),
			currentYear: Number(year),
		},
		listInvoicePaymentStatus: listInvoicePaymentStatus[0]?.listInvoicePaymentStatus, //refactor this
	};
};

exports.getInvoiceSendingStatus = async (buildingId) => {
	const buildingObjectId = mongoose.Types.ObjectId(buildingId);

	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const { currentMonth, currentYear } = currentPeriod;

	const invoiceStatus = await Entity.BuildingsEntity.aggregate(
		Pipelines.invoices.getInvoicesSendingStatus(buildingObjectId, currentMonth, currentYear),
	);

	const { listInvoiceInfo } = invoiceStatus[0];
	return { currentPeriod, listInvoiceInfo };
};

// this un refact bussiness logic
exports.modifyInvoice = async (invoiceId, feeIndexValues, stayDays, version) => {
	const currentInvoice = await Services.invoices.getInvoiceInfo(invoiceId);
	if (!currentInvoice) throw new NotFoundError('Hóa đơn không tồn tại');
	if (currentInvoice.locked === true) throw new BadRequestError('Hóa đơn đã đóng');
	if (version !== currentInvoice.version) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');

	const formatFees = generateInvoiceFees(currentInvoice.fee, 0, stayDays, feeIndexValues, false, 'modify');
	const totalRoomfees = calculateTotalFeeAmount(formatFees);
	const totalDebts = currentInvoice.debts?.reduce((sum, debt) => sum + debt.amount, 0) ?? 0;
	const newTotalInvoice = totalRoomfees + totalDebts;
	const invoiceStatus = getInvoiceStatus(currentInvoice.paidAmount, newTotalInvoice);

	const modifedInvoice = await Services.invoices.modifyInvoice({
		total: newTotalInvoice,
		fee: formatFees,
		status: invoiceStatus,
		stayDays: stayDays,
		invoiceId: invoiceId,
		version: version,
	});

	return 'success';
};

exports.getInvoiceDetail = async (invoiceId, buildingId) => {
	const invoiceObjectId = mongoose.Types.ObjectId(invoiceId);
	// const buildingObjectId = mongoose.Types.ObjectId(buildingId);

	const invoice = await Services.invoices.getInvoiceDetail(invoiceObjectId);
	const { _id: invoiceInfo, transactionInfo } = invoice;
	return { invoiceDetail: { ...invoiceInfo, transactionInfo }, paymentInfo: null };

	// if ((invoiceInfo.status === 'unpaid' || invoiceInfo.status === 'partial') && invoiceInfo.locked === false) {
	// 	const bankInfo = await Entity.BanksEntity.findOne({ building: { $in: [buildingObjectId] } });

	// 	return { invoiceDetail: { ...invoiceInfo, transactionInfo }, paymentInfo: bankInfo };
	// } else {
	// 	return { invoiceDetail: { ...invoiceInfo, transactionInfo }, paymentInfo: null };
	// }
};

//owner only
exports.deleteInvoice = async (invoiceId) => {
	let session;
	try {
		const invoiceObjectId = mongoose.Types.ObjectId(invoiceId);

		session = await mongoose.startSession();
		session.startTransaction();

		const invoice = await Entity.InvoicesEntity.findOne({ _id: invoiceObjectId });
		if (!invoice) throw new NotFoundError('Hóa đơn không tồn tại');
		const { fee } = invoice;
		const indexFees = fee.filter((f) => f.unit === 'index');

		const terminateInvoice = async () => {
			await Entity.InvoicesEntity.findOneAndUpdate({ _id: invoiceObjectId }, { $set: { status: 'terminated' } }, { session });
		};

		if (invoice.status === 'paid') {
			await terminateInvoice();
		}
		if (invoice.status === 'unpaid') {
			await terminateInvoice();
			if (indexFees.length > 0) {
				const operations = indexFees.map((f) => ({
					updateOne: {
						filter: {
							feeKey: f.feeKey,
							room: invoice.room,
						},
						update: {
							$set: { lastIndex: Number(f.firstIndex) },
						},
					},
				}));

				await Entity.FeesEntity.bulkWrite(operations, { session });
			}

			if (invoice.debts?.length > 0) {
				await Entity.DebtsEntity.updateMany(
					{ sourceId: invoiceObjectId },
					{ $set: { sourceId: null, status: 'pending', sourceType: 'pending' } },
					{ session },
				);
			}
		}
		if (invoice.status === 'partial') {
			await terminateInvoice();
		}

		await session.commitTransaction();

		return 'Success';
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.collectCashMoney = async (data) => {
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();
		const invoiceObjectId = mongoose.Types.ObjectId(data.invoiceId);
		const collectorObjectId = mongoose.Types.ObjectId(data.userId);

		const [currentInvoice] = await Entity.InvoicesEntity.aggregate(
			[
				{
					$match: {
						_id: invoiceObjectId,
					},
				},
				{
					$lookup: {
						from: 'transactions',
						localField: '_id',
						foreignField: 'invoice',
						as: 'transactionInfo',
					},
				},
			],
			{ session },
		).exec();

		if (!currentInvoice) {
			throw new NotFoundError('Hóa đơn không tồn tại');
		}

		const invoiceUnpaidAmount = currentInvoice.total - currentInvoice.paidAmount;
		const [createTransaction] = await Entity.TransactionsEntity.create(
			[
				{
					transactionDate: data.date,
					amount: data.amount,
					paymentMethod: 'cash',
					invoice: invoiceObjectId,
					collector: collectorObjectId,
					transferType: 'credit',
					idempotencyKey: data.idempotencyKey,
				},
			],
			{ session },
		);

		var totalTransactionAmount;
		const { transactionInfo, total: currentInvoiceAmount } = currentInvoice;
		if (transactionInfo?.length > 0) {
			totalTransactionAmount = transactionInfo.reduce((sum, item) => {
				return sum + item.amount;
			}, 0);
		} else {
			totalTransactionAmount = 0;
		}

		const updatedTotalPaid = totalTransactionAmount + createTransaction.amount;
		const remainingAmount = currentInvoiceAmount - updatedTotalPaid;

		let status = 'unpaid';
		if (remainingAmount <= 0) {
			status = 'paid';
		} else if (remainingAmount > 0 && updatedTotalPaid > 0) {
			status = 'partial';
		}

		await Entity.InvoicesEntity.updateOne({ _id: invoiceObjectId }, { $set: { status, paidAmount: updatedTotalPaid } }, { session });
		//Please change this logc
		if (currentInvoice.isDepositing === true) {
			const depositRefundInfo = await Entity.DepositRefundsEntity.findOne({ invoiceUnpaid: invoiceObjectId }).exec();
			if (!depositRefundInfo) throw new NotFoundError('Phiếu đặt cọc không tồn tại');

			const { depositRefundAmount } = depositRefundInfo;
			if (status === 'paid') {
				depositRefundInfo.depositRefundAmount = depositRefundAmount + invoiceUnpaidAmount;
				depositRefundInfo.invoiceUnpaid = null;
			} else if (status === 'partial') {
				depositRefundInfo.depositRefundAmount = depositRefundAmount + data.amount;
			}
			await depositRefundInfo.save({ session });
		}

		await session.commitTransaction();
		return 'Success';
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		session.endSession();
	}
};

exports.createInvoice = async (data) => {
	const { roomId, buildingId, stayDays, feeIndexValues, userId } = data;
	let session;

	try {
		const roomObjectId = mongoose.Types.ObjectId(roomId);
		const buildingObjectId = mongoose.Types.ObjectId(buildingId);
		const createrObjectId = mongoose.Types.ObjectId(userId);
		session = await mongoose.startSession();
		session.startTransaction();

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const roomContractOwner = await Services.customers.getContractOwner(roomObjectId, session);

		const roomFees = await Services.fees.getRoomFees(roomObjectId, session);
		const formatRoomFees = generateInvoiceFees(roomFees.feeInfo, roomFees._id.rent, stayDays, feeIndexValues, true, 'create');
		const totalRoomfees = calculateTotalFeeAmount(formatRoomFees);

		let getDebts = await Services.debts.getDebts(roomObjectId, session);
		if (getDebts.length > 0) getDebts = formatDebts(getDebts);
		else getDebts = null;

		const totalInvoiceAmount = totalRoomfees + (getDebts.amount ?? 0);
		const createdInvoice = await Services.invoices.createInvoice(
			{
				roomId: roomObjectId,
				listFees: formatRoomFees,
				totalInvoiceAmount,
				stayDays,
				debtInfo: getDebts,
				currentPeriod,
				payerName: roomContractOwner.fullName,
				creater: createrObjectId,
			},
			session,
		);

		await Entity.DebtsEntity.updateMany(
			{ room: roomObjectId },
			{ $set: { sourceId: createdInvoice._id, sourceType: 'invoice', status: 'closed' } },
			{ session },
		);

		await session.commitTransaction();
		return createdInvoice;
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		session.endSession();
	}
};

exports.deleteDebts = async (invoiceId, version) => {
	const invoiceInfo = await Services.invoices.getInvoiceInfo(invoiceId);

	const totalDebts = invoiceInfo.debts.reduce((sum, debt) => sum + debt.amount, 0);

	const result = await Entity.InvoicesEntity.updateOne(
		{
			_id: invoiceId,
			version: version,
		},
		{
			$set: {
				debts: null,
				status: getInvoiceStatus(invoiceInfo.paidAmount, invoiceInfo.total - totalDebts),
			},
			$inc: {
				version: 1,
				total: -totalDebts,
			},
		},
	);

	if (result.matchedCount === 0) {
		throw new ConflictError('Hóa đơn đã bị thay đổi');
	}

	return result;
};

// ========================== UN REFACTED ==========================//
// get fees create invoice
exports.getFeeForGenerateInvoice = async (data, cb, next) => {
	try {
		let roomObjectId = mongoose.Types.ObjectId(data.roomId);

		const feeInfo = await getRoomFees(roomObjectId);

		cb(null, feeInfo);
	} catch (error) {
		next(error);
	}
};

// piece of shit
exports.create = async (data, cb, next) => {
	// ALERT: CẦN UPDATE LẠI CHỈ SỐ CUỐI CỦA DOCUMENT FEE ( DONE )
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();

		const { fees, stayDays } = data;
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const feesObjectIds = fees.map((fee) => mongoose.Types.ObjectId(fee._id));
		const feesFromDb = await Entity.FeesEntity.find({ _id: { $in: feesObjectIds } });
		const getRentAmount = await Entity.ContractsEntity.findOne({ room: roomObjectId, status: 'active' });
		const getDebts = await Entity.DebtsEntity.find(
			{ room: roomObjectId, status: 'pending' },
			{ content: 1, amount: 1, status: 1, room: 1, month: 1, year: 1 },
		);

		if (!getRentAmount) {
			throw new AppError(errorCodes.notExist, 'Phòng không tồn tại trong hệ thống', 400);
		}

		if (feesFromDb.length !== feesObjectIds.length) {
			throw new AppError(errorCodes.invalidInput, 'Dữ liệu đầu vào không hợp lệ', 400);
		}

		const calculateInvoiceTotalAmount = () => {
			const totalFeeAmount = feesFromDb.reduce((sum, fee) => {
				const feeInput = fees.find((f) => f._id.toString() === fee._id.toString());
				if (!feeInput) {
					throw new AppError(errorCodes.invalidInput, 'Dữ liệu đầu vào không hợp lệ', 400);
				}

				if (fee.unit === 'index') {
					const first = Number(feeInput.firstIndex);
					const second = Number(feeInput.secondIndex);

					if (isNaN(first) || isNaN(second) || second < first) {
						throw new AppError(errorCodes.invalidInput, 'Giá trị chỉ số không hợp lệ', 400);
					}
					return sum + (second - first) * fee.feeAmount;
				}
				if (fee.unit === 'person' || fee.unit === 'vehicle') {
					const qty = Number(feeInput.quantity);
					return sum + ((fee.feeAmount * qty) / 30) * stayDays;
				}
				if (fee.unit === 'room') {
					return sum + (fee.feeAmount / 30) * stayDays;
				}

				return sum;
			}, 0);

			let debtsTotalAmount = 0;
			if (getDebts?.length > 0) {
				debtsTotalAmount = getDebts.reduce((sum, debt) => sum + Number(debt.amount), 0);
			}

			let totalRental = (Number(getRentAmount.rent) / 30) * stayDays;

			return totalFeeAmount + debtsTotalAmount + totalRental;
		};

		const calculateFeeIndexTotalAmount = (firstIndex, secondIndex, feeAmount) => {
			return (Number(secondIndex) - Number(firstIndex)) * Number(feeAmount);
		};

		const newFees = [];
		for (const data of feesFromDb) {
			const feeInput = fees.find((f) => f._id.toString() === data._id.toString());
			if (!feeInput) {
				throw new AppError(errorCodes.invalidInput, 'Dữ liệu đầu vào không hợp lệ', 400);
			}
			if (data.unit === 'index') {
				await Entity.FeesEntity.findOneAndUpdate({ _id: data._id }, { lastIndex: Number(feeInput.secondIndex) }).session(session);
				newFees.push({
					feeName: data.feeName,
					unit: data.unit,
					firstIndex: feeInput.firstIndex,
					lastIndex: feeInput.secondIndex,
					amount: calculateFeeIndexTotalAmount(feeInput.firstIndex, feeInput.secondIndex, data.feeAmount),
					feeKey: data.feeKey,
					feeAmount: data.feeAmount,
				});
			} else if (data.unit === 'vehicle' || data.unit === 'person') {
				newFees.push({
					feeName: data.feeName,
					unit: data.unit,
					amount: ((data.feeAmount * feeInput.quantity) / 30) * stayDays,
					feeKey: data.feeKey,
					feeAmount: data.feeAmount,
					quantity: feeInput.quantity,
				});
			} else if (data.unit === 'room') {
				newFees.push({
					feeName: data.feeName,
					unit: data.unit,
					amount: (data.feeAmount / 30) * stayDays,
					feeKey: data.feeKey,
					feeAmount: data.feeAmount,
				});
			} else {
				throw new AppError(errorCodes.invariantViolation, 'Thuộc tính của phí không được đĩnh nghĩa!', 200);
			}
		}

		newFees.push({
			feeName: 'Tiền phòng',
			unit: 'room',
			amount: (getRentAmount.rent / 30) * stayDays,
			feeAmount: getRentAmount.rent,
			feeKey: 'SPEC100PH',
		});

		const currentPeriod = await getCurrentPeriod(buildingObjectId);

		const [customerInfo] = await Entity.CustomersEntity.aggregate([
			{
				$match: {
					room: roomObjectId,
					isContractOwner: true,
				},
			},
			{
				$project: {
					_id: 1,
					fullName: 1,
					phone: 1,
					gender: 1,
				},
			},
		]).session(session);

		if (!customerInfo) throw new AppError(errorCodes.notExist, `Phòng không tồn tại chủ hợp đồng!`, 404);

		const paymentContent = await generatePaymentContent(process.env.PAYMENT_CONTENT_LENGTH);
		const invoiceCode = await generatePaymentContent(process.env.INVOICE_CODE_LENGTH);

		const [newInvoice] = await Entity.InvoicesEntity.create(
			[
				{
					stayDays: data.stayDays,
					month: currentPeriod?.currentMonth,
					year: currentPeriod?.currentYear,
					room: roomObjectId,
					status: 'unpaid',
					fee: newFees,
					total: calculateInvoiceTotalAmount(),
					paidAmount: 0,
					debts: getDebts,
					paymentContent,
					invoiceCode,
					invoiceContent: `Hóa đơn tiền nhà kỳ ${currentPeriod.currentMonth}, ${currentPeriod.currentYear}`,
					payer: customerInfo.fullName,
					locked: false,
					invoiceType: 'rental',
				},
			],
			{ session },
		);

		if (!newInvoice) throw new AppError(50001, 'Có lỗi trong quá tình tạo hóa đơn', 500);

		await Entity.DebtsEntity.updateMany(
			{ room: roomObjectId },
			{ $set: { sourceId: newInvoice._id, sourceType: 'invoice', status: 'closed' } },
			{ session },
		);

		// const getAccessToken = await Entity.OATokensEntity.findOne({ oaId: data.oaId });

		// if (!getAccessToken) throw new AppError(50001, 'OA Zalo Chưa được khởi tạo', 200);

		// const znsReqData = {
		// 	phone: formatPhone(customerInfo.phone),
		// 	buildingName: data.buildingName,
		// 	amount: newInvoice.total,
		// 	billCode: newInvoice.invoiceCode,
		// 	senderName: 'Đậu Quốc Lợi',
		// 	customerName: customerInfo.fullName,
		// 	roomIndex: data.roomIndex,
		// 	billStatus: newInvoice.status,
		// };

		// console.log('log of getAccessToken: ', getAccessToken.accessToken);

		// const handleSendZns = await zaloService.sendZNSInvoice(getAccessToken.accessToken, znsReqData, next);

		await session.commitTransaction();
		cb(null, [newInvoice]);
	} catch (error) {
		if (session) await session.abortTransaction();
		next(error);
	} finally {
		if (session) session.endSession();
	}
};

//TEST
exports.updateTest = (data, cb) => {
	MongoConnect.Connect(config.database.fullname)
		.then((db) => {
			Entity.InvoicesEntity.updateOne({ id: 118 }, { roomid: data.room.roomid }, { new: true }, cb);
		})
		.catch((err) => {
			console.log('rooms_Dataprovider_create: ' + err);
			cb(err, null);
		});
};

//piece of shit
exports.generateFirstInvoice = async (data, cb, next) => {
	try {
		// throw new AppError(errorCodes.notExist, 'Phòng không tồn tại', 200);
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const calculateFeeIndexTotalAmount = (firstIndex, lastIndex, feeAmount) => {
			return (Number(lastIndex) - Number(firstIndex)) * Number(feeAmount);
		};

		const newFees = data.fees
			.map((fee, index) => {
				if (fee.unit === 'index') {
					return {
						feeName: fee.feeName,
						unit: fee.unit,
						firstIndex: fee.firstIndex,
						lastIndex: fee.lastIndex,
						amount: calculateFeeIndexTotalAmount(fee.firstIndex, fee.lastIndex, fee.feeAmount),
						feeKey: fee.feeKey,
						feeAmount: fee.feeAmount,
					};
				}
				if (fee.unit === 'vehicle') {
					return {
						feeName: fee.feeName,
						unit: fee.unit,
						quantity: data.vehicleAmount,
						amount: Number(fee.feeAmount) * data.vehicleAmount,
						feeKey: fee.feeKey,
						feeAmount: fee.feeAmount,
					};
				}
				if (fee.unit === 'person') {
					return {
						feeName: fee.feeName,
						unit: fee.unit,
						quantity: data.customerAmount,
						amount: Number(fee.feeAmount) * data.customerAmount,
						feeKey: fee.feeKey,
						feeAmount: fee.feeAmount,
					};
				}
				if (fee.unit === 'room') {
					return {
						feeName: fee.feeName,
						unit: fee.unit,
						amount: Number(fee.feeAmount),
						feeKey: fee.feeKey,
						feeAmount: fee.feeAmount,
					};
				} else {
					throw new Error('Thuộc tính của phí không được định nghĩa !');
				}
			})
			.filter(Boolean); // Loại bỏ phần tử null hoặc undefined

		newFees.unshift({
			feeName: 'Tiền phòng',
			amount: data.rent,
			unit: 'room',
			feeKey: 'SPEC100PH',
			feeAmount: data.rent,
		});

		const calculateInvoiceTotalAmount = () => {
			const totalFeeAmount = newFees.reduce((sum, fee) => {
				if (fee.unit === 'index') {
					return sum + fee.amount;
				}
				if (fee.unit === 'person') {
					return sum + fee.amount;
				}
				if (fee.unit === 'room') {
					return sum + fee.amount;
				}
				if (fee.unit === 'vehicle') {
					return sum + fee.amount;
				}

				return sum;
			}, 0);

			return (totalFeeAmount / 30) * Number(data.stayDays);
		};

		const paymentContent = await generatePaymentContent(process.env.PAYMENT_CONTENT_LENGTH);

		const newInvoice = {
			stayDays: Number(data.stayDays),
			month: currentPeriod?.currentMonth,
			year: currentPeriod?.currentYear,
			room: roomObjectId,
			status: 'pending',
			fee: newFees,
			total: calculateInvoiceTotalAmount(),
			debts: [],
			paymentContent,
			payer: data.payer,
			locked: false,
			invoiceType: 'firstInvoice',
			invoiceContent: `Hóa đơn kỳ ${currentPeriod.currentMonth}, ${currentPeriod.currentYear}`,
		};

		let generateInvoice = await Entity.InvoicesEntity.create(newInvoice);
		cb(null, generateInvoice);
	} catch (error) {
		next(error);
	}
};

// ROLE CUSTOMERS
exports.getInvoiceInfoByInvoiceCode = async (data, cb, next) => {
	try {
		const [invoiceInfo] = await Entity.InvoicesEntity.aggregate([
			{
				$match: {
					invoiceCode: { $regex: new RegExp(`^${data.billCode}$`, 'i') },
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
								building: 1,
							},
						},
					],
					as: 'roomInfo',
				},
			},
			{
				$addFields:
					/**
					 * newField: The new field name.
					 * expression: The new field expression.
					 */
					{
						buildingId: {
							$getField: {
								field: 'building',
								input: {
									$arrayElemAt: ['$roomInfo', 0],
								},
							},
						},
					},
			},
			{
				$lookup: {
					from: 'banks',
					let: {
						buildingObjectId: '$buildingId',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$$buildingObjectId', '$building'],
								},
							},
						},
					],
					as: 'transferInfo',
				},
			},
			{
				$project:
					/**
					 * specifications: The fields to
					 *   include or exclude.
					 */
					{
						_id: 1,
						stayDays: 1,
						total: 1,
						status: 1,
						locked: 1,
						month: 1,
						year: 1,
						room: 1,
						fee: 1,
						debts: 1,
						paymentContent: 1,
						payer: 1,
						invoiceCode: 1,
						note: 1,
						createdAt: 1,
						roomIndex: {
							$getField: {
								field: 'roomIndex',
								input: {
									$arrayElemAt: ['$roomInfo', 0],
								},
							},
						},
						transferInfo: {
							$arrayElemAt: ['$transferInfo', 0],
						},
					},
			},
		]);
		if (invoiceInfo) {
			if (invoiceInfo.status === 'cancelled') throw new AppError(errorCodes.cancelled, 'Hóa đơn đã bị hủy', 400);
			else return cb(null, { ...invoiceInfo, type: 'invoice' });
		}

		const [receiptInfo] = await Entity.ReceiptsEntity.aggregate([
			{
				$match:
					/**
					 * query: The query in MQL.
					 */
					{
						receiptCode: { $regex: new RegExp(`^${data.billCode}$`, 'i') },
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
								building: 1,
							},
						},
					],
					as: 'roomInfo',
				},
			},
			{
				$addFields:
					/**
					 * newField: The new field name.
					 * expression: The new field expression.
					 */
					{
						buildingId: {
							$getField: {
								field: 'building',
								input: {
									$arrayElemAt: ['$roomInfo', 0],
								},
							},
						},
					},
			},
			{
				$lookup: {
					from: 'banks',
					let: {
						buildingObjectId: '$buildingId',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$in: ['$$buildingObjectId', '$building'],
								},
							},
						},
					],
					as: 'transferInfo',
				},
			},
			{
				$project:
					/**
					 * specifications: The fields to
					 *   include or exclude.
					 */
					{
						_id: 1,

						amount: 1,
						status: 1,
						locked: 1,
						month: 1,
						year: 1,
						room: 1,
						receiptContent: 1,
						paidAmount: 1,

						paymentContent: 1,
						payer: 1,
						invoiceCode: 1,

						roomIndex: {
							$getField: {
								field: 'roomIndex',
								input: {
									$arrayElemAt: ['$roomInfo', 0],
								},
							},
						},
						transferInfo: {
							$arrayElemAt: ['$transferInfo', 0],
						},
					},
			},
		]);

		if (receiptInfo) {
			if (receiptInfo.status != 'cancelled' && receiptInfo.status != 'terminated') {
				return cb(null, { ...receiptInfo, type: 'receipt' });
			} else throw new AppError(errorCodes.cancelled, 'Hóa đơn đã bị hủy', 400);
		}

		throw new AppError(errorCodes.notExist, 'Hóa đơn không tồn tại', 404);
	} catch (error) {
		next(error);
	}
};
