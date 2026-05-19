const formatCurrency = (value, currency = 'VNĐ') => {
	if (value === null || value === undefined || value === '') {
		return `0 ${currency}`;
	}

	const number = Number(String(value).replace(/[^\d.-]/g, ''));

	if (isNaN(number)) {
		return `0 ${currency}`;
	}

	return `${number.toLocaleString('en-US')} ${currency}`;
};

module.exports = formatCurrency;
