const calculateTotalExpenditures = (incidentalExpenditures, periodicExpenditures) => {
	const totalIncidentalExpenditure = incidentalExpenditures.reduce((total, exp) => total + exp.amount, 0);

	const totalPeriodicExpenditure = periodicExpenditures.reduce((total, exp) => total + exp.amount, 0);

	return Math.round(totalIncidentalExpenditure + totalPeriodicExpenditure);
};

module.exports = { calculateTotalExpenditures };
