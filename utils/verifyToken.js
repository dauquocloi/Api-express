const jwt = require('jsonwebtoken');

const verifyToken = (token) => {
	try {
		return jwt.verify(token, config.JWT.JWT_SECRET);
	} catch (error) {
		return new Error('authentication failed');
	}
};

module.exports = verifyToken;
