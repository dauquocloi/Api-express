const bcrypt = require('bcrypt');

const generateHashPassword = async (password, salt) => {
	if (!password) throw new Error('Password is required');

	return bcrypt.hash(password, salt);
};

module.exports = generateHashPassword;
