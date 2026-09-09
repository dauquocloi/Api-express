const { NoDataError, NotFoundError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');

exports.importFirstStatistics = async (data) => {
	const result = await Entity.StatisticsEntity.create(data);
	return result.toObject();
};

exports.createStatistics = async (
	{
		month,
		year,
		building,
		revenue,
		revenueComparisonRate,
		expenditure,
		expenditureComparitionRate,
		profit,
		profitComparisonRate,
		room: { totalRoom, rentedRoom, emptyRoom, occupancyRate, occupancyComparisonRate },
		vehicle: { totalVehicle, vehicleComparisonRate },
		customer: { temporaryResidentTotal, totalCustomer, customerComparisonRate },
	},
	session,
) => {
	const [result] = await Entity.StatisticsEntity.create(
		[
			{
				month,
				year,
				building,
				revenue,
				revenueComparisonRate,
				expenditure,
				expenditureComparitionRate,
				profit,
				profitComparisonRate,
				room: { totalRoom, rentedRoom, emptyRoom, occupancyRate, occupancyComparisonRate },
				vehicle: { totalVehicle, vehicleComparisonRate },
				customer: { temporaryResidentTotal, totalCustomer, customerComparisonRate },
			},
		],
		{ session },
	);
	return result.toObject();
};

exports.getStatistics = async (buildingObjectId, month, year, session) => {
	const [statistics] = await Entity.BuildingsEntity.aggregate(
		Pipelines.statistics.getStatisticsPipelineModify(buildingObjectId, month, year),
	).session(session);

	if (!statistics) throw new NotFoundError('Id tòa nhà không tồn tại');

	return statistics;
};

exports.getAllStatisticsInYear = async (buildingId, year) => {
	const result = await Entity.StatisticsEntity.find({ building: buildingId, year }).lean().exec();
	// if (!result || !result.length) throw new NoDataError('Không có dữ liệu !');
	return result;
};

exports.getStatisticCurrentPeriod = async (buildingId, currentMonth, currentYear) => {
	const [result] = await Entity.BuildingsEntity.aggregate(Pipelines.statistics.getStatisticCurrentPeriod(buildingId, currentMonth, currentYear));

	if (!result) throw new NotFoundError('Id tòa nhà không tồn tại');

	return result;
};

exports.findByBuildingId = (buildingId, month, year) => Entity.StatisticsEntity.findOne({ building: buildingId, month, year });
