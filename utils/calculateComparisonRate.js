const calculateComparisonRate = (pre, current) => {
	if (pre === 0) {
		return current === 0 ? 0 : null;
	}

	return Math.round(((current - pre) / pre) * 100);
};

module.exports = calculateComparisonRate;
