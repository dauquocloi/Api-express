const calculateTotalDebts = (debts) => {
	return debts.reduce((sum, debts) => sum + debts.amount, 0);
};

const formatDebts = (debts) => {
	if (!debts || !Array.isArray(debts)) return null;
	const totalDebts = debts.reduce((sum, debts) => sum + debts.amount, 0);

	const maxMonth = Math.max(...debts.map((i) => i.period?.month || 0));
	const maxYear = Math.max(...debts.map((i) => i.period?.year || 0));

	return {
		content:
			debts
				?.map((d) => d?.content)
				.filter(Boolean)
				.join(', ') || '',
		amount: totalDebts,
		month: maxMonth,
		year: maxYear,
	};
};

module.exports = { formatDebts, calculateTotalDebts };
