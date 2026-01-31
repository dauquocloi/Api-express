const { NoDataError } = require('../AppError');
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

// exports.getStatistics = async (buildingObjectId, month, year, session) => {
// 	const statistics = await Entity.StatisticsEntity.aggregate(Pipelines.statistics.getStatisticsPipeline(buildingObjectId, month, year)).session(
// 		session,
// 	);

// 	if (statistics.length == 0) {
// 		throw new NoDataError(`Không có dữ liệu thống kê cho kỳ ${month}, ${year}`);
// 	}

// 	return { statistics: statistics[0].recentStatistics };
// };

exports.getStatistics = async (buildingObjectId, month, year, session) => {
	const statistics = await Entity.BuildingsEntity.aggregate(
		Pipelines.statistics.getStatisticsPipelineModify(buildingObjectId, month, year),
	).session(session);

	if (statistics.length === 0) {
		throw new NoDataError(`Không có dữ liệu thống kê cho kỳ ${month}, ${year}`);
	}

	return { statistics: statistics[0].recentStatistics };
};
