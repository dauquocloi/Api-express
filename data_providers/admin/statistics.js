const { BadRequestError } = require('../../AppError');
const Services = require('../../service');
const calculatePercentage = require('../../utils/calculatePercentage');

exports.importFirstStatistics = async (data) => {
	const building = await Services.buildings.findById(data.buildingId).lean().exec();
	if (!building) throw new BadRequestError('Building not found');

	const statisticData = {
		building: data.buildingId,
		month: Number(data.month),
		year: Number(data.year),
		expenditure: Number(data.expenditure),
		expenditureComparitionRate: null,
		revenue: Number(data.revenue),
		revenueComparisonRate: null,
		profit: Number(data.profit),
		profitComparisonRate: null,
		// profitComparisonTrend: 'stable',
		revenueComparitionRate: 0,
		expenditureComparitionRate: 0,
		statisticsStatus: 'lock',
		room: {
			occupancyRate: Math.round(calculatePercentage(data.room.rentedRoom, data.room.totalRoom)),
			occupancyComparisonRate: null,
			rentedRoom: Number(data.room.rentedRoom),
			emptyRoom: Number(data.room.emptyRoom),
			totalRoom: Number(data.room.totalRoom),
		},
		customer: {
			temporaryResidentTotal: data.customer.temporaryResidentTotal,
			totalCustomer: data.customer.totalCustomer,
			customerComparisonRate: null,
		},
		vehicle: {
			totalVehicle: data.vehicle.totalVehicle,
			vehicelComparisonRate: null,
		},
	};
	console.log('statisticData: ', statisticData);
	const result = await Services.statistics.importFirstStatistics(statisticData);

	return result;
};
