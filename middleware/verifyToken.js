// const jwt = require('jsonwebtoken');

// const verifyToken = (req, res, next) => {
// 	const token = req.headers.authorization?.split(' ')[1];
// 	if (!token) return res.status(401).json({ message: 'Unauthorized' });

// 	try {
// 		const decoded = jwt.verify(token, config.JWT.JWT_SECRET);
// 		console.log('log of verify token: ', decoded);
// 		req.user = decoded;
// 		next();
// 	} catch (error) {
// 		return res.status(401).json({
// 			success: false,
// 			error: {
// 				message: 'Invalid token',
// 				statusCode: 401,
// 			},
// 		});
// 	}
// };

// module.exports = verifyToken;
