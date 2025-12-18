const { NotFoundError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');

const getAllByManagementId = async (userId) => {
	return await Entity.BuildingsEntity.find({ 'management.user': userId }).lean().exec();
};

const getAllBills = async (buildingId, month, year) => {
	const [getAllBill] = await Entity.BuildingsEntity.aggregate(Pipelines.buildings.getAllBillsPipeline(buildingId, month, year));
	if (!getAllBill) throw new NotFoundError('Không có dữ liệu');

	const calculateTotalAmount = () => {
		let totalAmount = 0;
		totalAmount += getAllBill.invoices.reduce((sum, item) => sum + item.total, 0);
		totalAmount += getAllBill.receipts.reduce((sum, item) => sum + item.amount, 0);
		return totalAmount;
	};

	const calculateTotalPaidAmount = () => {
		let totalPaidAmount = 0;
		totalPaidAmount += getAllBill.invoices.reduce((sum, item) => sum + (item.paidAmount ?? 0), 0);
		totalPaidAmount += getAllBill.receipts.reduce((sum, item) => sum + (item.paidAmount ?? 0), 0);
		return totalPaidAmount;
	};

	const billCollectedProgress = Math.round((calculateTotalPaidAmount() / calculateTotalAmount()) * 100);

	const totalBill = getAllBill.invoices.length + getAllBill.receipts.length;
	const totalBillUnpaid =
		getAllBill.invoices.filter((i) => i.status != 'unpaid').length + getAllBill.receipts.filter((r) => r.status != 'unpaid').length;

	return {
		totalBill: totalBill,
		totalBillUnpaid: totalBillUnpaid,
		billCollectedProgress,
	};
};

const getListSelectingRooms = async (buildingId) => {
	const [rooms] = await Entity.BuildingsEntity.aggregate(Pipelines.rooms.listSelectingRoomPipeline(buildingId));
	if (!rooms) throw new NotFoundError('Không có dữ liệu');
	return rooms.listRooms;
};

const getStatisticGeneral = async (buildingObjectId, year) => {
	return await Entity.StatisticsEntity.aggregate(Pipelines.buildings.getStatisticGeneral(buildingObjectId, year));
};

module.exports = { getAllByManagementId, getAllBills, getListSelectingRooms, getStatisticGeneral };
