const { BadRequestError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');

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

exports.generateExpenditures = async (data, session) => {
	const result = await Entity.ExpendituresEntity.insertMany(data, { session });
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
