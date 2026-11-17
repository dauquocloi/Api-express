const moment = require('moment');

const formatDate = (date) => {
	if (!date) return '';

	const parsedDate = moment(date);

	if (!parsedDate.isValid()) return '';

	return parsedDate.format('DD/MM/YYYY');
};

module.exports = formatDate;
