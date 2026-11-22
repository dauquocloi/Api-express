const Entity = require('../models');
const { depositStatus } = require('../constants/deposits');
const Pipelines = require('./aggregates');
const { ConflictError, InternalError, NotFoundError } = require('../AppError');

exports.findById = (depositId) => Entity.DepositsEntity.findById(depositId);

exports.findDepositByRoomId = (roomId) =>
	Entity.DepositsEntity.findOne({
		room: roomId,
		status: { $nin: [depositStatus['CLOSED'], depositStatus['CANCELLED'], depositStatus['PENDING']] },
	});

exports.getDeposits = async (buildingObjectId) => {
	const [result] = await Entity.DepositsEntity.aggregate(Pipelines.deposits.getDepositsPipeline(buildingObjectId));
	if (!result) return [];
	return result?.listDeposits ?? [];
};

exports.getDepositDetail = async ({ depositId }) => {
	const [result] = await Entity.DepositsEntity.aggregate(Pipelines.deposits.getDepositDetail(depositId));
	if (!result) throw new NotFoundError('Dữ liệu không tồn tại !');
	return result;
};

exports.findByReceiptId = (receiptId) => Entity.DepositsEntity.findOne({ receipt: receiptId });

exports.cancelledDeposit = async (depositId, version) => {
	const result = await Entity.DepositsEntity.updateOne(
		{ _id: depositId, version: version },
		{ $set: { status: depositStatus['CANCELLED'] }, $inc: { version: 1 } },
	);
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu đặt cọc đã bị thay đổi!');
};

exports.terminateDeposit = async (depositId, version) => {
	const result = await Entity.DepositsEntity.updateOne(
		{ _id: depositId, version: version },
		{ $set: { status: depositStatus['TERMINATED'] }, $inc: { version: 1 } },
	);
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu đặt cọc đã bị thay đổi!');
};

exports.generateDeposit = async ({
	roomId,
	buildingId,
	receiptId,
	rent,
	depositAmount,
	actualDepositAmount,
	depositCompletionDate,
	checkinDate,
	rentalTerm,
	numberOfOccupants,
	customer,
	interiors,
	fees,
	status,
	previewDocumentPath,
	previewExpAt,
	contractPeriod,
	note,
}) => {
	const result = await Entity.DepositsEntity.create({
		room: roomId,
		building: buildingId,
		receipt: receiptId,
		status: status,
		rent: rent,
		depositAmount: depositAmount,
		actualDepositAmount: actualDepositAmount,
		depositCompletionDate: depositCompletionDate,
		checkinDate: checkinDate,
		rentalTerm: rentalTerm,
		numberOfOccupants: numberOfOccupants,
		customer: customer,
		fees: fees,
		interiors: interiors,
		previewDocument: {
			filePath: previewDocumentPath,
			expAt: previewExpAt,
		},
		contractPeriod,
		note,
	});

	if (!result) throw new InternalError('Tạo khoản đặt cọc thất bại !');
	return result;
};

exports.updateDepositByPayment = async ({ depositId, receiptId, actualDepositAmount, status }) => {
	const result = await Entity.DepositsEntity.updateOne(
		{
			_id: depositId,
			receipt: receiptId,
		},
		{
			$set: { actualDepositAmount, status },
			$inc: { version: 1 },
		},
	);

	if (result.matchedCount === 0) throw new NotFoundError('Dữ liệu đặt cọc không tồn tại !');
};

exports.getDepositInfoForModifyDeposit = async ({ depositId }) => {
	const [result] = await Entity.DepositsEntity.aggregate(Pipelines.deposits.getDepositInfoForModifyDeposit(depositId));
	if (!result) throw new NotFoundError('Dữ liệu không tồn tại');
	return result;
};

exports.modifyDeposit = async ({
	depositId,
	fees,
	customer,
	interiors,
	status,
	rent,
	depositAmount,
	actualDepositAmount,
	checkinDate,
	depositCompletionDate,
	rentalTerm,
	numberOfOccupants,
	version,
	contractPeriod,
	note,
	previewDocumentPath,
	previewExpAt,
}) => {
	const result = await Entity.DepositsEntity.findOneAndUpdate(
		{
			_id: depositId,
			version: version,
		},
		{
			$set: {
				fees,
				customer,
				interiors,
				status,
				rent,
				depositAmount,
				actualDepositAmount,
				checkinDate,
				depositCompletionDate,
				rentalTerm,
				numberOfOccupants,
				contractPeriod,
				note,
				previewDocument: {
					previewDocumentPath,
					previewExpAt,
				},
			},
			$inc: { version: 1 },
		},
		{ new: true },
	);

	if (!result) throw new ConflictError('Dữ liệu đặt cọc đã bị thay đổi !');

	return result;
};

exports.closeDeposit = async ({ depositId }) => {
	const result = await Entity.DepositsEntity.updateOne({ _id: depositId }, { $set: { status: depositStatus['CLOSED'] }, $inc: { version: 1 } });
	if (result.matchedCount === 0) throw new NotFoundError('Dữ liệu đặt cọc không tồn tại');
};

exports.updateDepositStatusByReceiptId = async (receiptId, status) => {
	const result = await Entity.DepositsEntity.findOneAndUpdate(
		{ receipt: receiptId },
		{
			$set: { status: status },
			$inc: { version: 1 },
		},
		{ new: true },
	);
	if (!result) throw new NotFoundError('Dữ liệu phiếu cọc không tồn tại!');
	return result;
};

exports.addDeopsitReceipt = async ({ depositId, receiptId }) => {
	const result = await Entity.DepositsEntity.findOneAndUpdate(
		{
			_id: depositId,
		},
		{
			$set: { receipt: receiptId, status: depositStatus['WAITING_PAYMENT'] },
		},
	);

	if (!result) throw new NotFoundError('Dữ liệu đặt cọc không tồn tại!');
	return result;
};
