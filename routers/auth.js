const jwt = require('jsonwebtoken');
const useCase = require('../cores/users');
const cookieParser = require('cookie-parser');

exports.refreshToken = async (req, res, next) => {
	try {
		let data = { ...req.body, ...req.params };
		const refreshToken = req.cookies?.refreshToken;
		console.log('log of cookies: ', req.cookies);
		if (!refreshToken)
			return res.status(401).json({
				success: false,
				error: {
					message: 'You are not authenticated',
					statusCode: 401,
				},
			});
		const currentRefreshToken = useCase.getRefreshToken(
			req,
			(err, result) => {
				console.log('log of result: ', result);
				if (err) {
					return res.status(401).json({
						success: false,
						error: {
							message: 'Fail to get refresh token',
							statusCode: 401,
						},
					});
				}
				if (!result.includes(refreshToken)) {
					return res.status(403).json({
						success: false,
						error: {
							message: 'Refresh token is not valid',
							statusCode: 403,
						},
					});
				}
				console.log('currentRefreshToken:', currentRefreshToken);

				const decoded = jwt.verify(refreshToken, config.JWT.JWT_REFRESH);
				console.log('log of decoded refreshToken: ', decoded);
				const newAccessToken = jwt.sign({ userId: decoded._id, role: decoded.role }, config.JWT.JWT_SECRET);
				const newReFresh = jwt.sign({ userId: decoded._id, role: decoded.role }, config.JWT.JWT_REFRESH);

				res.cookie('refreshToken', refreshToken, {
					httpOnly: true,
					secure: false, // Chỉ hoạt động trên HTTPS (bật nếu chạy production)
					sameSite: 'Strict', // Ngăn chặn CSRF
					maxAge: 7 * 24 * 60 * 60 * 1000, // Thời gian sống của refresh token (7 ngày)
				});

				res.status(200).json({ accessToken: newAccessToken });
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};
