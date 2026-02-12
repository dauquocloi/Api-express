const { NotFoundError, BadRequestError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');
const Roles = require('../constants/userRoles');

const findById = (buildingId) => Entity.BuildingsEntity.findById(buildingId);

const findByManagementId = (userId) => Entity.BuildingsEntity.find({ 'management.user': userId });

const findUserInBuilding = async (userId, buildingId) => {
	return await Entity.BuildingsEntity.findOne({ _id: buildingId, 'management.user': userId }).lean().exec();
};

const getAllByManagementId = async (userId) => {
	return await Entity.BuildingsEntity.find({ 'management.user': userId }).lean().exec();
};

const getOwnerInfo = (buildingId) => {
	return Entity.BuildingsEntity.findOne(
		{
			_id: buildingId,
		},
		{
			management: { $elemMatch: { role: Roles['OWNER'] } },
			buildingName: 1,
			_id: 1,
			buildingAddress: 1,
		},
	);
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

const importBuilding = async (
	{ buildingSortName, buildingAddress, roomQuantity, invoiceNotes, contractDocxUrl, contractPdfUrl, depositTermUrl, management },
	session,
) => {
	const [result] = await Entity.BuildingsEntity.create(
		[
			{
				buildingName: buildingSortName,
				buildingAddress,
				roomQuantity,
				invoiceNotes,

				management,
				contractDocxUrl,
				contractPdfUrl,
				depositTermUrl,
			},
		],
		{ session },
	);
	return result.toObject();
};

const getFinanceSettlementData = async (buildingObjectId, currentMonth, currentYear, session) => {
	const [result] = await Entity.BuildingsEntity.aggregate(
		Pipelines.buildings.getFinanceSettlementData(buildingObjectId, currentMonth, currentYear),
	).session(session);
	if (!result) throw new BadRequestError('Id tòa nhà không tồn tại');
	return result;
};

const addManagement = async (userId, buildingIds, role, session) => {
	const result = await Entity.BuildingsEntity.updateMany(
		{ _id: { $in: buildingIds } },
		{ $push: { management: { user: userId, role } } },
		{ session },
	);
	if (result.matchedCount === 0 || result.matchedCount !== buildingIds.length) throw new NotFoundError('Id tòa nhà không tồn tại');
	return result;
};

const pullManagementNotMatchBuilding = async (buildingObjectIds, userId, session) => {
	const result = await Entity.BuildingsEntity.updateMany(
		{
			_id: { $nin: buildingObjectIds },
			'management.user': userId,
		},
		{
			$pull: {
				management: { user: userId },
			},
		},
		{ session },
	);

	return result;
};

const findAndModifyManagement = async (buildingObjectIds, userObjectId, role, session) => {
	const result = await Entity.BuildingsEntity.updateMany(
		{
			_id: { $in: buildingObjectIds },
		},
		[
			{
				$set: {
					management: {
						$concatArrays: [
							// 1. Giữ lại toàn bộ management KHÔNG PHẢI user này
							{
								$filter: {
									input: '$management',
									as: 'm',
									cond: { $ne: ['$$m.user', userObjectId] },
								},
							},
							// 2. Thêm lại user với role mới (CHỈ 1 BẢN GHI)
							[
								{
									user: userObjectId,
									role: role,
								},
							],
						],
					},
				},
			},
		],
		{ session, updatePipeline: true },
	);

	if (result.matchedCount !== buildingObjectIds.length) {
		throw new NotFoundError('Có building không tồn tại');
	}

	return result;
};

const getPrepareFinanceSettlementData = async (buildingObjectId, currentMonth, currentYear) => {
	const [result] = await Entity.BuildingsEntity.aggregate(
		Pipelines.buildings.getPrepareFinanceSettlementData(buildingObjectId, currentMonth, currentYear),
	);
	if (!result || !result._id) throw new NotFoundError('Id tòa nhà không tồn tại');
	return result;
};

const importPaymentInfo = async (buildingId, bankAccountId) => {
	const result = await Entity.BuildingsEntity.updateOne(
		{
			_id: buildingId,
		},
		{
			$set: {
				paymentInfo: bankAccountId,
			},
			$inc: { version: 1 },
		},
	);
	if (result.matchedCount === 0) throw new NotFoundError('Tòa nhà không tồn tại');
	return result;
};

const getAllInvoicesInPeriod = async (buildingObjectId, month, year, session) => {
	const [result] = await Entity.BuildingsEntity.aggregate(Pipelines.buildings.getAllInvoicesInPeriod(buildingObjectId, month, year)).session(
		session,
	);
	if (!result) throw new NotFoundError('Id tòa nhà không tồn tại');
	return result.invoices;
};

module.exports = {
	getAllByManagementId,
	getAllBills,
	getListSelectingRooms,
	getStatisticGeneral,
	findById,
	findByManagementId,
	findUserInBuilding,
	importBuilding,
	getFinanceSettlementData,
	addManagement,
	pullManagementNotMatchBuilding,
	findAndModifyManagement,
	getPrepareFinanceSettlementData,
	getOwnerInfo,
	importPaymentInfo,
	getAllInvoicesInPeriod,
};
