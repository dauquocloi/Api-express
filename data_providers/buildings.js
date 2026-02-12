const mongoose = require('mongoose');
let Entity = require('../models');
const bcrypt = require('bcrypt');
const { result } = require('underscore');
var XLSX = require('xlsx');
const uploadFile = require('../utils/uploadFile');
const withSignedUrls = require('../utils/withSignedUrls');
const Services = require('../service');
const Pipelines = require('../service/aggregates');
const { BadRequestError, NotFoundError, InternalError, NoDataError, InvalidInputError } = require('../AppError');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const getFileUrl = require('../utils/getFileUrl');
const { receiptStatus, receiptTypes: RECEIPT_TYPES } = require('../constants/receipt');
const { debtStatus } = require('../constants/debts');
const { calculateInvoiceUnpaidAmount } = require('../utils/calculateFeeTotal');
const { invoiceStatus } = require('../constants/invoices');
const {
	isMissingInvoice,
	formatPeriodicExpenditurePayload,
	handleReceiptSettlement,
	generateDebtFromReceipts,
	generateDebtFromInvoices,
	existTransactionUnConfirmed,
} = require('./buildings.util');
const { depositRefundStatus } = require('../constants/deposits');
const { checkoutCostStatus } = require('../constants/checkoutCosts');

//  get all buildings by managername
exports.getAll = async (userId) => {
	const userObjectId = new mongoose.Types.ObjectId(userId);
	const buildings = await Services.buildings.getAllByManagementId(userObjectId);
	if (!buildings || buildings.length === 0) throw new NotFoundError('Không tìm thấy tòa nhà');
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

// exports.getStatistics = async (buildingId, month, year) => {
// 	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

// 	if (!month || !year) {
// 		const currentPeriod = await getCurrentPeriod(buildingObjectId);
// 		month = currentPeriod.currentMonth;
// 		year = currentPeriod.currentYear;
// 	} else {
// 		Number(month);
// 		Number(year);
// 	}

// 	const statistics = await Entity.BuildingsEntity.aggregate(Pipelines.statistics.getStatisticsPipeline(buildingObjectId, month, year));

// 	if (statistics.length == 0) {
// 		throw new NoDataError(`Không có dữ liệu thống kê cho kỳ ${month}, ${year}`);
// 	}

// 	return { statistics: statistics[0].recentStatistics };
// };

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

// owner only
exports.getBuildingPermissions = async (userId) => {
	const buildingSettings = await Entity.BuildingsEntity.find(
		{ 'management.user': userId },
		{ settings: 1, buildingName: 1, buildingAddress: 1, _id: 1 },
	);
	if (!buildingSettings || buildingSettings.length === 0) throw new NotFoundError('Tòa nhà không tồn tại!');
	// const response = buildingSettings.map((b) => b.settings);

	return buildingSettings;
};

// owner only
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
	if (!building) throw NotFoundError('Dữ liệu không tồn tại');
	const depositTermFileUrl = await getFileUrl(building.depositTermUrl);
	return { depositTermFileUrl: depositTermFileUrl };
};

exports.prepareFinanceSettlement = async (buildingId, userId) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const currentPeriod = await getCurrentPeriod(buildingObjectId);

	const { depositRefundsUnpaid, checkoutCostsUnpaid, invoicesUnpaid, receiptsUnpaid } = await Services.buildings.getPrepareFinanceSettlementData(
		buildingObjectId,
		currentPeriod.currentMonth,
		currentPeriod.currentYear,
	);
	return { depositRefundsUnpaid, checkoutCostsUnpaid, invoicesUnpaid, receiptsUnpaid };
};

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
