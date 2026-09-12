const Entity = require('../models');
const { depositStatus } = require('../constants/deposits');
const Pipelines = require('./aggregates');
const { ConflictError, InternalError, NotFoundError } = require('../AppError');

exports.findById = (depositId) => Entity.DepositsEntity.findById(depositId);

exports.findDepositByRoomId = async (roomId, session) => {
	const query = Entity.DepositsEntity.findOne({
		room: roomId,
		status: { $nin: [depositStatus['CLOSED'], depositStatus['CANCELLED'], depositStatus['PENDING']] },
	});
	if (session) query.session(session);
	const result = await query.lean().exec();
	return result;
};

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

exports.cancelledDeposit = async (depositId, version, session) => {
	const result = await Entity.DepositsEntity.updateOne(
		{ _id: depositId, version: version },
		{ $set: { status: depositStatus['CANCELLED'] }, $inc: { version: 1 } },
		{ session },
	);
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu đặt cọc đã bị thay đổi!');
	return result;
};

exports.generateDeposit = async (
	{
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
	},
	session,
) => {
	const [result] = await Entity.DepositsEntity.create(
		[
			{
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
			},
		],
		{ session },
	);

	if (!result) throw new InternalError('Tạo khoản đặt cọc thất bại !');
	return result;
};

exports.updateActualDepositAmountByReceiptId = async ({ receiptId, actualDepositAmount, status, version }) => {
	const result = await Entity.DepositsEntity.updateOne(
		{
			receipt: receiptId,
			// version: version,
		},
		{
			$set: { actualDepositAmount, status },
			$inc: { version: 1 },
		},
	);

	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu đặt cọc đã bị thay đổi!');
	return result;
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
}) => {
	const result = await Entity.DepositsEntity.updateOne(
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
			},
			$inc: { version: 1 },
		},
	);

	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu đặt cọc đã bị thay đổi !');
};
