const mongoose = require('mongoose');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { BadRequestError, NotFoundError } = require('../AppError');
const Services = require('../service');
const { expenditureType } = require('../constants');

exports.getExpenditures = async (buildingId, month, year) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const { currentMonth, currentYear } = currentPeriod;
	if (!month || !year) {
		month = currentMonth;
		year = currentYear;

		const expenditures = await Services.expenditures.getExpendituresStatusUnLocked(buildingObjectId, month, year);
		const { incidentalExpenditures, periodicExpenditures } = expenditures;

		return { incidentalExpenditures, periodicExpenditures, period: { month: month, year: year }, status: 'unlock' };
	} else {
		month = parseInt(month);
		year = parseInt(year);

		if (month == currentMonth && year == currentYear) {
			const expenditures = await Services.expenditures.getExpendituresStatusUnLocked(buildingObjectId, month, year);

			const { incidentalExpenditures, periodicExpenditures } = expenditures;
			return { incidentalExpenditures, periodicExpenditures, period: { month: month, year: year }, status: 'unlock' };
		} else {
			// if (month > currentMonth && year >= currentYear) {
			// 	return null;
			// }

			const expenditureLocked = await Services.expenditures.getExpendituresStatusLocked(buildingObjectId, month, year);
			const { expenditures } = expenditureLocked;
			if (expenditures.length === 0)
				return { period: { month: month, year: year }, status: 'lock', incidentalExpenditures: [], periodicExpenditures: [] };

			let incidentalExpenditures = expenditures.filter((expenditure) => expenditure.type === 'incidental');
			let periodicExpenditures = expenditures.filter((expenditure) => expenditure.type === 'periodic');
			return { incidentalExpenditures, periodicExpenditures, period: { month: month, year: year }, status: 'lock' };
		}
	}
};

exports.createExpenditure = async (data) => {
	const { buildingId, content, amount, type, spender, date } = data;
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	if (type === expenditureType['INCIDENTAL']) {
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const newIncidentalExpenditure = await Services.expenditures.generateExpenditure({
			month: currentPeriod.currentMonth,
			year: currentPeriod.currentYear,
			content,
			amount,
			type: expenditureType['INCIDENTAL'],
			building: buildingId,
			spender,
			date,
		});

		return newIncidentalExpenditure;
	} else if (type === expenditureType['PERIODIC']) {
		const newPeriodicExpenditure = await Services.expenditures.generatePeriodicExpenditure({
			content: content,
			amount: amount,
			building: buildingObjectId,
		});

		return newPeriodicExpenditure;
	} else {
		throw new BadRequestError('Expenditure type invalid');
	}
};

exports.modifyExpenditure = async (data) => {
	const { spender, amount, content, date, expenditureId, type, version } = data;

	if (type === expenditureType['INCIDENTAL']) {
		const updatedExpenditure = await Services.expenditures.modifyExpenditure({
			expenditureId,
			content,
			amount,
			date,
			spender,
			version,
		});

		return updatedExpenditure;
	}
	if (type === expenditureType['PERIODIC']) {
		const updatedPeriodicExpenditure = await Services.expenditures.modifyPeriodicExpenditure({
			expenditureId,
			content,
			amount,
			version,
		});

		return updatedPeriodicExpenditure;
	}

	throw new BadRequestError('Expenditure type invalid');
};

exports.deleteExpenditure = async (data) => {
	const { expenditureId, type } = data;

	if (type === expenditureType['INCIDENTAL']) {
		const currentExpenditure = await Services.expenditures.findById(expenditureId);
		if (!currentExpenditure) throw new NotFoundError('Dữ liệu không tốn tại !');
		if (currentExpenditure.locked === true) throw new BadRequestError('Dữ liệu khoản chi này không thể cập nhật !');

		await Services.expenditures.removeExpenditure({ expenditureId });
	} else if (type === expenditureType['PERIODIC']) {
		await Services.expenditures.removePeriodicExpenditure({ expenditureId });
	} else {
		throw new BadRequestError('Expenditure type invalid');
	}
};
