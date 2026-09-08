const mongoose = require('mongoose');
let Entity = require('../models');
const Services = require('../service');
const { BadRequestError, NotFoundError, InternalError, NoDataError, InvalidInputError } = require('../AppError');
const crypto = require('crypto');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const getFileUrl = require('../utils/getFileUrl');
const {
	isMissingInvoice,
	formatPeriodicExpenditurePayload,
	handleReceiptSettlement,
	generateDebtFromReceipts,
	generateDebtFromInvoices,
	existTransactionUnConfirmed,
	generateColumnExcel,
	generateRowExcelData,
	formatExcel,
	styleExcel,
	checkFinnaceSettlementCondition,
	calculateFinalProfit,
} = require('./buildings.util');
const ExcelJS = require('exceljs');
const uploadFile = require('../utils/uploadFile');
const { FailureMsgResponse } = require('../utils/apiResponse');
const deleteFileFromS3 = require('../utils/deleteFileFromS3');
const { client: redis } = require('../config').redisDb;
const { getRevenues } = require('./revenues');
const { getExpenditures } = require('./expenditures');
const { calculateTotalExpenditures } = require('./expenditures.util');
const calculateComparisonRate = require('../utils/calculateComparisonRate');
const { STATISTIC_STATUS } = require('../constants');

//  get all buildings by managername
exports.getAll = async (userId) => {
	const userObjectId = new mongoose.Types.ObjectId(userId);
	const buildings = await Services.buildings.getAllBuildingsByManagementId(userObjectId);
	if (!buildings || buildings.length === 0) throw new NotFoundError('Dữ liệu không tồn tại');
	return buildings;
};

exports.getBillCollectionProgress = async (data) => {
	const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);

	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const { currentMonth, currentYear } = currentPeriod;

	const bills = await Services.buildings.getAllBills(buildingObjectId, currentMonth, currentYear);
	if (!bills) throw new NoDataError('Không có dữ liệu');
	return bills;
};

exports.getRooms = async (data) => {
	const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);
	const rooms = await Services.rooms.getAllRooms(buildingObjectId);

	return rooms;
};

exports.getListSelectingRoom = async (buildingId) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const rooms = await Services.buildings.getListSelectingRooms(buildingObjectId);
	return rooms;
};

exports.getCheckoutCosts = async (buildingId, month, year) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	if (!month || !year) {
		const currentPeriod = await getCurrentPeriod(buildingId);
		month = currentPeriod.currentMonth;
		year = currentPeriod.currentYear;
	} else {
		Number(month);
		Number(year);
	}

	const result = await Services.checkoutCosts.getCheckoutCosts(buildingObjectId, month, year);

	return result;
};

exports.getStatistics = async (buildingId, month, year) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	if (!month || !year) {
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		month = currentPeriod.currentMonth;
		year = currentPeriod.currentYear;
	} else {
		Number(month);
		Number(year);
	}

	const statistics = await Services.statistics.getStatistics(buildingObjectId, month, year);

	return statistics;
};

exports.getStatisticsV2 = async (buildingId, month, year) => {
	let result;

	const currentPeriod = await getCurrentPeriod(buildingId);
	if (!month || !year) {
		month = currentPeriod.currentMonth;
		year = currentPeriod.currentYear;
	}

	if (year == currentPeriod.currentYear) {
		const currentMonth = currentPeriod.currentMonth;
		const currentYear = currentPeriod.currentYear;
		const [revenues, expenditures, statistics, currentStatistics] = await Promise.all([
			getRevenues({ buildingId, month: currentMonth, year: currentYear }),
			getExpenditures(buildingId, currentMonth, currentYear),
			Services.statistics.getAllStatisticsInYear(buildingId, currentYear),
			Services.statistics.getStatisticCurrentPeriod(buildingId, currentMonth, currentYear),
		]);
		const { preStatistics } = currentStatistics;

		if (!preStatistics) throw new NoDataError('Dữ liệu ban đầu chưa được khởi tạo !');

		const totalExpenditure = calculateTotalExpenditures(expenditures?.incidentalExpenditures || [], expenditures?.periodicExpenditures || []);
		const totalProfit = calculateFinalProfit(revenues?.actualTotalRevenue ?? 0, totalExpenditure);

		const formatCurrentStatistics = {
			_id: new mongoose.Types.ObjectId(),
			statisticsStatus: STATISTIC_STATUS['UN_LOCK'],
			buildingId: buildingId,
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
			revenue: revenues?.actualTotalRevenue,
			revenueComparisonRate: calculateComparisonRate(preStatistics?.revenue ?? 0, revenues?.actualTotalRevenue ?? 0),
			expenditure: totalExpenditure,
			expenditureComparisonRate: calculateComparisonRate(preStatistics?.expenditure ?? 0, totalExpenditure),
			profit: totalProfit,
			profitComparisonRate: calculateComparisonRate(preStatistics?.profit ?? 0, totalProfit),

			room: currentStatistics.room,
			vehicle: currentStatistics.vehicle,
			customer: currentStatistics.customer,
		};

		result = {
			statistics: [...statistics, formatCurrentStatistics],
		};
	} else {
		result = await Services.statistics.getAllStatisticsInYear(buildingId, year);
	}

	return result;
};

// owner only // REFACTORED !
exports.getBuildingPermissions = async (userId) => {
	const buildingSettings = await Entity.BuildingsEntity.find(
		{ 'management.user': userId },
		{ settings: 1, buildingName: 1, buildingAddress: 1, _id: 1 },
	);
	if (!buildingSettings || buildingSettings.length === 0) throw new NotFoundError('Tòa nhà không tồn tại!');
	// const response = buildingSettings.map((b) => b.settings);

	return buildingSettings;
};

// owner only // REFACTORED !
exports.setBuildingPermission = async (buildingId, type, enabled) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const result = await Entity.BuildingsEntity.findOneAndUpdate({ _id: buildingObjectId }, { $set: { [`settings.${type}`]: enabled } });
	if (!result) throw new NotFoundError('Tòa nhà không tồn tại!');
	return 'Success';
};

exports.getStatisticGeneral = async (buildingId, year) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	if (!year) {
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const { currentMonth, currentYear } = currentPeriod;
		year = currentYear;
	} else year = Number(year);

	const statistics = await Services.buildings.getStatisticGeneral(buildingObjectId, year);

	if (!statistics || statistics.length === 0) return [];

	return statistics;
};

exports.getDepositTermFile = async (buildingId) => {
	const building = await Services.buildings.findById(buildingId).lean().exec();
	if (!building) throw new NotFoundError('Dữ liệu không tồn tại');
	if (!building.depositTermUrl) return { depositTermFileUrl: '' };
	const depositTermFileUrl = await getFileUrl(building.depositTermUrl);
	if (!depositTermFileUrl) throw new NotFoundError('Không tìm thấy file điều khoản đặt cọc !');
	return { depositTermFileUrl: depositTermFileUrl };
};

exports.upLoadDepositTermFile = async (buildingId, depositTermFile) => {
	const building = await Services.buildings.findById(buildingId);
	if (!building) throw new NotFoundError('Dữ liệu không tồn tại');

	if (building.depositTermUrl) {
		await deleteFileFromS3(building.depositTermUrl);
	}
	const result = await uploadFile(depositTermFile);
	if (!result || !result.Key) throw new FailureMsgResponse('Upload file thất bại');

	building.depositTermUrl = result.Key;
	await building.save();
	return { depositTermFileUrl: result.url };
};

exports.getFinanceSettlementConditionInfo = async (buildingId) => {
	const currentPeriod = await getCurrentPeriod(buildingId);
	const result = await Services.buildings.getPrepareFinanceSettlementV2(buildingId, currentPeriod.currentMonth, currentPeriod.currentYear);
	const { checkoutCostsUnpaid, depositRefundsUnpaid, invoicesUnpaid, receiptsUnpaid, pendingTransactions } = result;
	const { pass } = checkFinnaceSettlementCondition({ checkoutCostsUnpaid, depositRefundsUnpaid, pendingTransactions });
	const response = {
		buildingId: result._id,
		checkoutCostsUnpaid: checkoutCostsUnpaid.length || 0,
		depositRefundsUnpaid: depositRefundsUnpaid.length || 0,
		invoicesUnpaid: invoicesUnpaid.length || 0,
		receiptsUnpaid: receiptsUnpaid.length || 0,
		pendingTransactions: pendingTransactions.length || 0,
		pass,
	};
	return response;
};

// Cần khóa việc sửa các collections (DONE)
exports.prepareFinanceSettlement = async (buildingId, userId) => {
	const ttl = 10 * 60 * 1000;
	const createdAt = Date.now();
	const expiredAt = createdAt + ttl;
	const queryId = crypto.randomUUID();

	const currentPeriod = await getCurrentPeriod(buildingId);

	const { depositRefundsUnpaid, checkoutCostsUnpaid, invoicesUnpaid, receiptsUnpaid, pendingTransactions } =
		await Services.buildings.getPrepareFinanceSettlementV2(buildingId, currentPeriod.currentMonth, currentPeriod.currentYear);

	const { pass, reason, items } = checkFinnaceSettlementCondition({
		checkoutCostsUnpaid,
		depositRefundsUnpaid,
		pendingTransactions,
	});

	if (!pass) {
		return {
			passed: false,
			reason,
			items,
		};
	}

	await Services.rooms.lockAllRoomsForSettlement(buildingId, userId, expiredAt);

	return {
		passed: true,
		invoicesUnpaid: invoicesUnpaid || [],
		receiptsUnpaid: receiptsUnpaid || [],
		queryId,
		createdAt,
		expiredAt,
	};
};

// exports.prepareFinanceSettlementV2 = idempotent(async (buildingId, userId) => {
// 	const ttl = 10 * 60 * 1000;
// 	const createdAt = new Date();
// 	const expiredAt = new Date(createdAt.getTime() + ttl);
// 	const queryId = crypto.randomUUID();

// 	const currentPeriod = await getCurrentPeriod(buildingId);

// 	const { depositRefundsUnpaid, checkoutCostsUnpaid, invoicesUnpaid, receiptsUnpaid, pendingTransactions } =
// 		await Services.buildings.getPrepareFinnaceSettlementDataV2(buildingId, currentPeriod.currentMonth, currentPeriod.currentYear, session);

// 	const { pass, reason, items } = checkFinnaceSettlementCondition({
// 		checkoutCostsUnpaid,
// 		depositRefundsUnpaid,
// 		pendingTransactions,
// 	});

// 	if (!pass) {
// 		return {
// 			passed: false,
// 			reason,
// 			items,
// 		};
// 	}

// 	await Services.rooms.lockAllRoomsForSettlement(buildingId, userId, session, expiredAt);

// 	return {
// 		passed: true,
// 		invoicesUnpaid: invoicesUnpaid || [],
// 		receiptsUnpaid: receiptsUnpaid || [],
// 		queryId,
// 		createdAt,
// 		expiredAt,
// 	};

// 	// return {
// 	// 	...result,
// 	// 	queryId,
// 	// 	createdAt,
// 	// 	expiredAt,
// 	// };
// });

exports.financeSettlement = async (buildingId, userId) => {
	let result;
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

			await Services.rooms.lockAllRoomsForSettlement(buildingId, userId, session);
			const building = await Services.buildings.findById(buildingId).session().lean().exec();
			if (!building) throw new BadRequestError('Tòa nhà không tồn tại');

			const currentPeriod = await getCurrentPeriod(buildingId);
			const { currentMonth, currentYear } = currentPeriod;

			const settlementData = await Services.buildings.getFinanceSettlementData(buildingObjectId, currentMonth, currentYear, session);
			const { receipts, invoices, expenditures, periodicExpenditures, incidentalRevenues, rooms } = settlementData;

			const isInvoiceMissing = isMissingInvoice(rooms, invoices);
			if (isInvoiceMissing) throw new BadRequestError('Mọi hóa đơn tiền phòng phải được gửi trước khi chốt sổ !');

			const getAllTransactions = await Services.transactions.getAllTransactionsInPeriod(buildingObjectId, currentMonth, currentYear, session);
			const existTransactionUnConfirmedInPeriod = existTransactionUnConfirmed(getAllTransactions);
			if (existTransactionUnConfirmedInPeriod === true) {
				throw new BadRequestError('Tồn tại giao dịch chưa xác nhận. Vui lòng xác nhận mọi giao dịch trước khi quyết toán.');
			}

			const { receiptUpdatingIds, receiptCarriedOverPaidAmountMap } = handleReceiptSettlement(receipts, currentMonth, currentYear);
			const receiptDebts = generateDebtFromReceipts(receipts, currentMonth, currentYear);
			const { debts: invoiceDebts, invoiceUpdatingIds } = generateDebtFromInvoices(invoices, currentMonth, currentYear);

			const generateDebtsPayload = [...receiptDebts, ...invoiceDebts];
			await Services.debts.generateDebts(generateDebtsPayload, session);
			await Services.invoices.closeAllInvoices(invoiceUpdatingIds, session);
			await Services.receipts.closeAllReceipts(receiptUpdatingIds, session);

			const result = await Services.receipts.updateReceiptsCarriedOverPaidAmount(receiptCarriedOverPaidAmountMap, session);
			console.log('result: ', result);

			const periodicExpendituresPayload = formatPeriodicExpenditurePayload(periodicExpenditures, currentMonth, currentYear, buildingId, userId);
			await Services.expenditures.generateExpenditures(periodicExpendituresPayload, session);
			await Services.expenditures.lockAllExpenditures(buildingId, currentMonth, currentYear, session);
			if (incidentalRevenues.length > 0) await Services.revenues.lockAllIncidentalRevenues(buildingId, currentMonth, currentYear, session);

			const getStatistics = await Services.statistics.getStatistics(buildingObjectId, currentMonth, currentYear, session);
			const currentStatistics = getStatistics[getStatistics.statistics.length - 1];

			await Services.statistics.createStatistics({
				month: currentMonth === 12 ? 1 : currentMonth + 1,
				year: currentMonth === 12 ? currentYear + 1 : currentYear,
				building: buildingId,
				revenue: currentStatistics.revenue,
				revenueComparisonRate: currentStatistics.revenueComparisonRate,
			});

			throw new BadRequestError('Stop here for testing');
			// return true;
		});

		return;
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.getContractTermUrl = async (buildingId) => {
	const currentBuilding = await Services.buildings.findById(buildingId).lean().exec();
	if (!currentBuilding) throw new BadRequestError('Tòa nhà không tồn tại');
	if (!currentBuilding.contractPdfUrl) throw new NotFoundError('Tòa nhà chưa khởi tạo điều khoản hợp đồng !');
	const contractTermFileUrl = await getFileUrl(currentBuilding.contractPdfUrl);
	return { contractTermFileUrl: contractTermFileUrl };
};

exports.getBuildingReportXlsx = async (buildingId, month, year) => {
	let currentMonth;
	let currentYear;
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	if (!month || !year) {
		const currentPeriod = await getCurrentPeriod(buildingId);
		currentMonth = currentPeriod.currentMonth;
		currentYear = currentPeriod.currentYear;
	} else {
		currentMonth = Number(month);
		currentYear = Number(year);
	}
	const data = await Services.buildings.getExcelData(buildingObjectId, currentMonth, currentYear);

	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Invoices');

	// 1. Tạo header
	const schema = generateColumnExcel(data, worksheet);

	worksheet.columns = schema.map((col) => ({
		header: col.header,
		key: col.key,
		width: col.width,
	}));

	// 2. Add row (1 room = 1 row)
	const rows = generateRowExcelData(data);

	// 3. Add + format
	rows.forEach((rowData) => {
		const row = worksheet.addRow(rowData);
		formatExcel(row, schema, rowData);
	});

	// 4. Style
	styleExcel(worksheet, schema);

	return workbook;
};

exports.getBuildingContractPdfUrl = async (buildingId) => {
	const building = await Services.buildings.findById(buildingId).lean().exec();
	if (!building) throw new BadRequestError('Tòa nhà không tồn tại');
	if (!building.contractPdfUrl) return { contractPdfUrl: '' };
	const result = await getFileUrl(building.contractPdfUrl);
	if (!result || !result.url) return { contractTermFileUrl: '' };
	return { contractTermFileUrl: result.url };
};

exports.getBankAccount = async (buildingId) => {
	const building = await Services.buildings.findById(buildingId).lean().exec();
	if (!building) throw new NotFoundError('Tòa nhà không tồn tại');
	const result = await Services.bankAccounts.findByBuildingId(buildingId).populate('bank').lean().exec();
	if (!result) return null;
	return {
		_id: result._id,
		paymentConfirmationMode: building.paymentConfirmationMode,
		buildingId: buildingId,
		bank: result.bank,
		accountNumber: result.accountNumber,
		accountName: result.accountName,
		bankApiConnected: result.bankApiConnected,
		createdAt: result.createdAt,
		updatedAt: result.updatedAt,
	};
};
