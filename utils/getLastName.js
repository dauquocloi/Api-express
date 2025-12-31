const getLastName = (fullName) => {
	if (!fullName || typeof fullName !== 'string') return '';
	return fullName.trim().split(' ').slice(-1).join(' ');
};

module.exports = getLastName;
