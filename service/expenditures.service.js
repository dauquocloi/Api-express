const { BadRequestError, ConflictError, NotFoundError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');
const { expenditureType } = require('../constants');

exports.findById = (expenditureId) => Entity.ExpendituresEntity.findById(expenditureId);

exports.getExpendituresStatusLocked = async (buildingId, month, year) => {
	const [result] = await Entity.BuildingsEntity.aggregate(Pipelines.expenditures.getExpendituresStatusLocked(buildingId, month, year));
	if (!result) throw new BadRequestError('Id tòa nhà không tồn tại');
	return result;
};

exports.getExpendituresStatusUnLocked = async (buildingId, month, year) => {
	const [result] = await Entity.BuildingsEntity.aggregate(Pipelines.expenditures.getExpenditures(buildingId, month, year));
	if (!result) throw new BadRequestError('Id tòa nhà không tồn tại');
	return result;
};

exports.generateExpenditures = async (data) => {
	const result = await Entity.ExpendituresEntity.insertMany(data);
	return result;
};

exports.generateExpenditure = async ({ month, year, content, amount, type, building, spender, date }) => {
	const result = await Entity.ExpendituresEntity.create({
		month,
		year,
		content,
		amount,
		type,
		building,
		spender, // Owner only
		date: date || new Date(),
	});
	return result;
};

exports.lockAllExpenditures = async (buildingId, month, year, session) => {
	const result = await Entity.ExpendituresEntity.updateMany(
		{ building: buildingId, month: month, year: year },
		{ $set: { locked: true }, $inc: { version: 1 } },
		{ session },
	);
	return result;
};

exports.modifyExpenditure = async ({ amount, content, spender, date, expenditureId, version }) => {
	const result = await Entity.ExpendituresEntity.findOneAndUpdate(
		{ _id: expenditureId, version },
		{
			$set: { amount, content, spender, date },
			$inc: { version: 1 },
		},
		{ new: true },
	);

	if (!result) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi, vui lòng tải lại trang !');
	return result;
};

exports.removeExpenditure = async ({ expenditureId }) => {
	const result = await Entity.ExpendituresEntity.deleteOne({ _id: expenditureId });
	if (result.deletedCount !== 1) throw new NotFoundError('Dữ liệu không tồn tại !');
	return 'success';
};

// ========= PERIODIC EXPENDITURE ================ //

exports.generatePeriodicExpenditure = async ({ content, amount, building }) => {
	const result = await Entity.PeriodicExpendituresEntity.create({
		content,
		amount,
		building,
	});
	return result;
};

exports.modifyPeriodicExpenditure = async ({ amount, content, expenditureId, version }) => {
	const result = await Entity.PeriodicExpendituresEntity.findOneAndUpdate(
		{ expenditureId, version },
		{
			$set: { amount, content },
			$inc: { version: 1 },
		},
		{ new: true },
	);
	if (!result) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi, vui lòng tải lại trang !');
	return result;
};

exports.removePeriodicExpenditure = async ({ expenditureId }) => {
	const result = await Entity.PeriodicExpendituresEntity.deleteOne({ _id: expenditureId });
	if (result.deletedCount !== 1) throw new NotFoundError('Dữ liệu không tồn tại !');
	return 'success';
};
