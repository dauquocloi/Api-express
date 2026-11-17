const capitalizeFirstLetter = (str) => {
	if (!str) return '';
	if (str.charAt(0) === str.charAt(0).toUpperCase()) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
};

module.exports = capitalizeFirstLetter;
