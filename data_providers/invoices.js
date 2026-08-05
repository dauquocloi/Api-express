const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const generatePaymentContent = require('../utils/generatePaymentContent');
const { AppError, NoEntryError, NotFoundError, BadRequestError, ConflictError, InternalError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const zaloService = require('../service/zalo.service');
const Pipelines = require('../service/aggregates');
const Services = require('../service');
const { formatDebts } = require('../service/debts.helper');
const { calculateTotalFeeAmount, calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { generateInvoiceFees } = require('../service/invoices.helper');
const { getInvoiceStatus } = require('../service/invoices.helper');
const { feeUnit } = require('../constants/fees');
const { invoiceStatus, invoiceType } = require('../constants/invoices');
const { client: redis } = require('../config').redisDb;
const { NotiManagerCollectCashInvoiceJob } = require('../jobs/Notifications');
const { znsNewInvoiceNotiJob } = require('../jobs/ZNS/zns.job');
const Roles = require('../constants/userRoles');
const { billType } = require('../constants/bills');
const { notificationJob } = require('../jobs/notification/notification.job');
const { NOTI_MANAGER_COLLECT_CASH_INVOICE } = require('../jobs/constant/jobNames');

exports.getInvoicesPaymentStatus = async (buildingId, month, year) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	if (!month || !year) {
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		month = currentPeriod.currentMonth;
		year = currentPeriod.currentYear;
	} else {
		Number(month);
		Number(year);
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
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const { currentMonth, currentYear } = currentPeriod;

	const invoiceStatus = await Entity.BuildingsEntity.aggregate(
		Pipelines.invoices.getInvoicesSendingStatus(buildingObjectId, currentMonth, currentYear),
	);

	const { listInvoiceInfo } = invoiceStatus[0];
	return { currentPeriod, listInvoiceInfo };
};

// this un refact bussiness logic
exports.modifyInvoice = async (invoiceId, feeIndexValues, stayDays, version, userId, redisKey) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentInvoice = await Services.invoices.findById(invoiceId).session(session).lean().exec();
			if (!currentInvoice) throw new NotFoundError('Hóa đơn không tồn tại');
			if (currentInvoice.locked === true) throw new BadRequestError('Hóa đơn đã đóng');
			if (version !== currentInvoice.version) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');

			await Services.rooms.assertRoomWritable({ roomId: currentInvoice.room, userId, session });

			const formatFees = generateInvoiceFees(currentInvoice.fee, 0, stayDays, feeIndexValues, false, 'modify');
			console.log('log of formatFees from modifyInvoice: ', formatFees);
			const totalRoomfees = calculateTotalFeeAmount(formatFees);

			const totalDebts = currentInvoice.debts?.reduce((sum, debt) => sum + debt.amount, 0) ?? 0;

			const newTotalInvoice = totalRoomfees + totalDebts;
			const invoiceStatus = getInvoiceStatus(currentInvoice.paidAmount, newTotalInvoice);

			const modifedInvoice = await Services.invoices.modifyInvoice(
				{
					total: newTotalInvoice,
					fee: formatFees,
					status: invoiceStatus,
					stayDays: stayDays,
					invoiceId: invoiceId,
					version: version,
				},
				session,
			);

			const roomFeesUnitIndex = await Services.fees.getFeeUnitIndexByRoomId({ roomId: currentInvoice.room }, session);

			if (roomFeesUnitIndex.length === 0) return;

			const newFeeMap = new Map(formatFees.map((f) => [f.feeKey, f]));
			console.log('log of newFeeMap: ', newFeeMap);
			console.log('log of roomFeesUnitIndex: ', roomFeesUnitIndex);

			for (const fee of roomFeesUnitIndex) {
				const newFee = newFeeMap.get(fee.feeKey);
				if (!newFee) continue;

				if (newFee.lastIndex !== fee.lastIndex) {
					await Services.fees.modifyFeeUnitIndex(fee._id, newFee.lastIndex, fee.amount, fee.version, session);
				}
			}

			return 'success';
		});

		await redis.set(redisKey, 'SUCCESS:' + JSON.stringify({}), 'EX', process.env.REDIS_EXP_SEC, 'NX');
		return 'success';
	} catch (error) {
		await redis.set(redisKey, 'FAIL:' + error.message, 'EX', process.env.REDIS_EXP_SEC, 'NX');
		throw error;
	} finally {
		if (session) {
			session.endSession();
		}
	}
};

exports.getInvoiceDetail = async (invoiceId, buildingId) => {
	const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);

	const invoice = await Services.invoices.getInvoiceDetail(invoiceObjectId);
	const { _id: invoiceInfo, transactionInfo } = invoice;

	const bankAccount = await Services.bankAccounts.findByBuildingId(buildingId).populate('bank').lean().exec();
	if (!bankAccount) throw new NotFoundError('Không tìm thấy tài khoản ngân hàng của tòa nhà !');

	return {
		invoiceDetail: { ...invoiceInfo, transactionInfo },
		paymentInfo: {
			_id: bankAccount._id,
			accountNumber: bankAccount.accountNumber,
			accountName: bankAccount.accountName,
			bank: bankAccount.bank,
		},
	};
};

//owner only
exports.deleteInvoice = async (invoiceId, userId, invoiceVersion) => {
	let session;
	try {
		const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);

		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const invoice = await Services.invoices.findById(invoiceObjectId).session(session).lean().exec();
			if (!invoice) throw new NotFoundError('Hóa đơn không tồn tại');
			if (invoice.invoiceType === invoiceType['FIRST_INVOICE']) throw new BadRequestError('Không thể xóa hóa đơn tháng đầu tiên !');

			await Services.rooms.assertRoomWritable({ roomId: invoice.room, userId, session });

			const { fee } = invoice;
			const feeIndexes = fee.filter((f) => f.unit === feeUnit['INDEX']);

			const invoiceTerminated = await Entity.InvoicesEntity.findOneAndUpdate(
				{ _id: invoiceObjectId, version: invoiceVersion },
				{ $set: { status: invoiceStatus['TERMINATED'] }, $inc: { version: 1 } },
				{ session },
			);

			if (invoiceTerminated.matchedCount === 0) throw new ConflictError('Hóa đơn này đã bị thay đổi !');

			if (invoice.status === invoiceStatus['UNPAID']) {
				if (feeIndexes.length > 0) {
					// const operations = feeIndexes.map((f) => ({
					// 	updateOne: {
					// 		filter: {
					// 			feeKey: f.feeKey,
					// 			room: invoice.room,
					// 		},
					// 		update: {
					// 			$set: { lastIndex: Number(f.firstIndex) },
					// 		},
					// 	},
					// }));

					// await Entity.FeesEntity.bulkWrite(operations, { session });
					await Services.fees.rollbackFeeIndexValuesByFeeKey(feeIndexes, invoice.room, session);
					await Services.fees.rollBackFeeIndexHistoryMany(
						feeIndexes.map((f) => f.feeKey),
						invoice.room,
						session,
					);
				}

				if (invoice.debts?.length > 0) {
					await Entity.DebtsEntity.updateMany(
						{ sourceId: invoiceObjectId },
						{ $set: { sourceId: null, status: 'pending', sourceType: 'pending' } },
						{ session },
					);
				}
			}

			await Services.rooms.bumpRoomVersionBlind(invoice.room, session);

			return 'Success';
		});

		return 'Success';
	} finally {
		if (session) session.endSession();
	}
};

//should removed
exports.collectCashMoney = async (invoiceId, buildingId, date, amount, collectorId, version, redisKey) => {
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();
		const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);
		const collectorObjectId = new mongoose.Types.ObjectId(collectorId);

		const currentInvoice = await Services.invoices.findById(invoiceObjectId).session(session).lean().exec();
		if (!currentInvoice) throw new NotFoundError('Hóa đơn không tồn tại');
		if (currentInvoice.status === invoiceStatus['PAID']) throw new BadRequestError('Hóa đơn này đã được thanh toán, vui lòng tải lại trang');
		if (currentInvoice.version !== version) throw new ConflictError('Hóa đơn này được bị thay đổi, vui lòng tải lại trang');

		const currentPeriod = await getCurrentPeriod(buildingId);

		const createTransaction = await Services.transactions.createCashTransaction(
			{
				amount: amount,
				date: date,
				type: 'invoice',
				collectorId: collectorObjectId,
				id: invoiceObjectId,
				currentPeriod,
				idempotencyKey: redisKey,
			},
			session,
		);

		const unpaidAmount = calculateInvoiceUnpaidAmount(currentInvoice.total, currentInvoice.paidAmount);
		const appliedAmount = Math.min(createTransaction.amount, unpaidAmount);

		const updatedTotalPaid = currentInvoice.paidAmount + createTransaction.amount;
		const newInvoiceStatus = getInvoiceStatus(updatedTotalPaid, currentInvoice.total);
		await Services.invoices.updateInvoicePaidStatusWithVersion(
			{ invoiceId, paidAmount: updatedTotalPaid, invoiceStatus: newInvoiceStatus, version },
			session,
		);

		if (currentInvoice?.detuctedInfo) {
			const { detuctedType } = currentInvoice.detuctedInfo;
			if (detuctedType === 'depositRefund') {
				const depositRefundInfo = await Services.depositRefunds.findByInvoiceUnpaidId(invoiceObjectId).session(session);
				if (!depositRefundInfo) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');

				depositRefundInfo.depositRefundAmount += appliedAmount;
				if (newInvoiceStatus === invoiceStatus['PAID']) {
					depositRefundInfo.invoiceUnpaid = null;
					await Services.invoices.removeDetuctedInfo(invoiceObjectId, session);
				}
				depositRefundInfo.version += 1;
				await depositRefundInfo.save({ session });
			}
			if (detuctedType === 'terminateContractEarly') {
				const checkoutCost = await Services.checkoutCosts.findByInvoiceId(invoiceObjectId).session(session);
				if (!checkoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại');

				checkoutCost.total -= appliedAmount;
				if (newInvoiceStatus === invoiceStatus['PAID']) {
					checkoutCost.invoiceUnpaid = null;
					await Services.invoices.removeDetuctedInfo(invoiceObjectId, session);
				}
				checkoutCost.version += 1;
				await checkoutCost.save({ session });
			}
		}

		// await new Noti

		await new NotiManagerCollectCashInvoiceJob().enqueue({
			collectorId: collectorObjectId,
			invoiceId: invoiceId.toString(),
			amount: amount,
		});

		await session.commitTransaction();

		const cbData = {
			transactionId: createTransaction._id,
		};
		await redis.set(redisKey, `SUCCESS:${JSON.stringify(cbData)}`, 'EX', process.env.REDIS_EXP_SEC);
		return 'Success';
	} catch (error) {
		if (session) await session.abortTransaction();
		await redis.set(
			redisKey,
			JSON.stringify({
				status: 'FAILED',
				message: error.message,
			}),
			'EX',
			process.env.REDIS_EXP_SEC,
		);
		throw error;
	} finally {
		session.endSession();
	}
};

exports.checkout = async (invoiceId, buildingId, date, amount, collectorInfo, version, redisKey, paymentMethod) => {
	let session;
	try {
		session = await mongoose.startSession();
		session.startTransaction();
		const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);
		const collectorObjectId = new mongoose.Types.ObjectId(collectorInfo._id);

		const currentInvoice = await Services.invoices.findById(invoiceObjectId).session(session).lean().exec();
		if (!currentInvoice) throw new NotFoundError('Hóa đơn không tồn tại');
		if (currentInvoice.status === invoiceStatus['PAID']) throw new BadRequestError('Hóa đơn này đã được thanh toán, vui lòng tải lại trang');
		if (currentInvoice.version !== version) throw new ConflictError('Hóa đơn này được bị thay đổi, vui lòng tải lại trang');

		const currentPeriod = await getCurrentPeriod(buildingId);

		let createTransaction;
		if (paymentMethod === 'cash') {
			createTransaction = await Services.transactions.createCashTransaction(
				{
					amount: amount,
					date: date,
					type: 'invoice',
					collectorId: collectorObjectId,
					id: invoiceObjectId,
					currentPeriod,
					idempotencyKey: redisKey,
					createdBy: collectorInfo.role,
				},
				session,
			);

			//=========== NOTIFICATION ==========//
			if (collectorInfo.role !== Roles['OWNER']) {
				await notificationJob({
					collectorId: collectorObjectId,
					invoiceId: invoiceId.toString(),
					amount: amount,
					notiType: NOTI_MANAGER_COLLECT_CASH_INVOICE,
				});
			}
		} else {
			createTransaction = await Services.transactions.generateTransferTransactionByManagement(
				{
					amount: amount,
					idempotencyKey: redisKey,
					collector: collectorObjectId,
					createdBy: collectorInfo.role,
					date,
					invoice: invoiceObjectId,
					month: currentPeriod.currentMonth,
					year: currentPeriod.currentYear,
				},
				session,
			);
		}

		const unpaidAmount = calculateInvoiceUnpaidAmount(currentInvoice.total, currentInvoice.paidAmount);
		const appliedAmount = Math.min(createTransaction.amount, unpaidAmount);

		const updatedTotalPaid = currentInvoice.paidAmount + createTransaction.amount;
		const newInvoiceStatus = getInvoiceStatus(updatedTotalPaid, currentInvoice.total);
		await Services.invoices.updateInvoicePaidStatusWithVersion(
			{ invoiceId, paidAmount: updatedTotalPaid, invoiceStatus: newInvoiceStatus, version },
			session,
		);

		if (currentInvoice?.detuctedInfo) {
			const { detuctedType } = currentInvoice.detuctedInfo;
			if (detuctedType === 'depositRefund') {
				const depositRefundInfo = await Services.depositRefunds.findByInvoiceUnpaidId(invoiceObjectId).session(session);
				if (!depositRefundInfo) throw new NotFoundError('Phiếu hoàn cọc không tồn tại');

				depositRefundInfo.depositRefundAmount += appliedAmount;
				if (newInvoiceStatus === invoiceStatus['PAID']) {
					depositRefundInfo.invoiceUnpaid = null;
					await Services.invoices.removeDetuctedInfo(invoiceObjectId, session);
				}
				depositRefundInfo.version += 1;
				await depositRefundInfo.save({ session });
			}
			if (detuctedType === 'terminateContractEarly') {
				const checkoutCost = await Services.checkoutCosts.findByInvoiceId(invoiceObjectId).session(session);
				if (!checkoutCost) throw new NotFoundError('Phiếu trả phòng không tồn tại');

				checkoutCost.total -= appliedAmount;
				if (newInvoiceStatus === invoiceStatus['PAID']) {
					checkoutCost.invoiceUnpaid = null;
					await Services.invoices.removeDetuctedInfo(invoiceObjectId, session);
				}
				checkoutCost.version += 1;
				await checkoutCost.save({ session });
			}
		}

		await session.commitTransaction();

		const cbData = {
			transactionId: createTransaction._id,
		};
		await redis.set(redisKey, `SUCCESS:${JSON.stringify(cbData)}`, 'EX', process.env.REDIS_EXP_SEC);
		return 'Success';
	} catch (error) {
		if (session) await session.abortTransaction();
		await redis.set(redisKey, `FAILED:${JSON.stringify({ error: error.message })}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		session.endSession();
	}
};

exports.createInvoice = async (roomId, buildingId, stayDays, feeIndexValues, createrId, roomVersion, redisKey) => {
	let session;
	let result;
	try {
		const roomObjectId = new mongoose.Types.ObjectId(roomId);
		const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

		session = await mongoose.startSession();

		await session.withTransaction(async () => {
			const paymentInfo = await Services.bankAccounts.findByBuildingId(buildingId).session(session).lean().exec();
			if (!paymentInfo) throw new BadRequestError('Tòa nhà chưa có thông tin thanh toán !');

			await Services.rooms.assertRoomWritable({ roomId, userId: createrId, session });
			const currentPeriod = await getCurrentPeriod(buildingObjectId);
			const roomContractOwner = await Services.customers
				.findIsContractOwnerByRoomId(roomObjectId)
				.session(session)
				.populate('contract')
				.lean()
				.exec();
			if (!roomContractOwner || !roomContractOwner.contract) throw new NotFoundError(`Phòng không tồn tại chủ hợp đồng !`);

			const roomFees = await Services.fees.getRoomFeesAndDebts(roomObjectId, session);
			console.log('log of roomFees: ', roomFees);
			const formatRoomFees = generateInvoiceFees(roomFees.feeInfo, roomFees._id.rent, stayDays, feeIndexValues, true, 'create');
			const totalRoomfees = calculateTotalFeeAmount(formatRoomFees);

			let getDebts = await Services.debts.getDebts(roomObjectId, session);
			if (getDebts.length > 0) getDebts = formatDebts(getDebts);
			else getDebts = null;

			const totalInvoiceAmount = totalRoomfees + (getDebts?.amount ?? 0);
			const createdInvoice = await Services.invoices.createInvoice(
				{
					roomId: roomObjectId,
					listFees: formatRoomFees,
					totalInvoiceAmount,
					stayDays,
					debtInfo: getDebts,
					currentPeriod,
					payerName: roomContractOwner.fullName,
					creater: createrId,
					contract: roomContractOwner.contract._id,
				},
				session,
			);

			await Entity.DebtsEntity.updateMany(
				{ room: roomObjectId },
				{ $set: { sourceId: createdInvoice._id, sourceType: 'invoice', status: 'closed' } },
				{ session },
			);

			const roomFeeIndexes = roomFees.feeInfo.filter((fee) => fee.unit === feeUnit.INDEX);
			const roomFeeIndexIds = roomFeeIndexes.map((fee) => fee._id.toString());

			const updateFeeIndexHistoryPayload = roomFeeIndexes.map((fee) => ({
				feeId: fee._id,
				lastIndex: feeIndexValues[fee._id].secondIndex,
				prevIndex: feeIndexValues[fee._id].firstIndex,
			}));

			await Services.fees.updateFeeIndexValues(roomFeeIndexIds, feeIndexValues, session);
			await Services.fees.updateFeeIndexHistoryMany({ payloads: updateFeeIndexHistoryPayload, editorId: createrId }, session);
			await Services.rooms.unLockedRoom(roomId, session);
			await Services.rooms.bumpRoomVersion(roomId, roomVersion, session);

			await znsNewInvoiceNotiJob({ billId: createdInvoice._id, type: billType.INVOICE });

			result = createdInvoice;
			return 'Success';
		});

		await redis.set(redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
		return result;
	} catch (error) {
		await redis.set(redisKey, JSON.stringify({ status: 'FAILED', message: error.message }), 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

// exports.createFirstInvoice = async (roomId, buildingId, fees, rent, stayDays) => {
// 	const roomObjectId = new mongoose.Types.ObjectId(roomId);
// 	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
// 	const createrObjectId = new mongoose.Types.ObjectId(userId);
// 	const currentPeriod = await getCurrentPeriod(buildingObjectId);
// 	const roomContractOwner = await Services.customers.getContractOwner(roomObjectId, session);

// 	const roomFees = await Services.fees.getRoomFees(roomObjectId, session);
// 	const formatRoomFees = generateInvoiceFees(roomFees.feeInfo, roomFees._id.rent, stayDays, feeIndexValues, true, 'create');
// 	const totalRoomfees = calculateTotalFeeAmount(formatRoomFees);

// 	const createdInvoice = await Services.invoices.createInvoice(
// 		{
// 			roomId: roomObjectId,
// 			listFees: formatRoomFees,
// 			totalInvoiceAmount: totalRoomfees,
// 			stayDays,
// 			debtInfo: null,
// 			currentPeriod,
// 			payerName: roomContractOwner.fullName,
// 			creater: createrObjectId,
// 		},
// 		session,
// 	);
// }

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
