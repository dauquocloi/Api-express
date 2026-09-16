const { BadRequestError } = require('../AppError');
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

exports.generateExpenditure = async ({ month, year, content, amount, type, building, spender }) => {
	const result = await Entity.ExpendituresEntity.create({
		month,
		year,
		content,
		amount,
		type,
		building,
		spender, // Owner only
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
