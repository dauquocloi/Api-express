const zaloService = require('../../service/zalo.service');

exports.zaloCallback = async (req, res, next) => {
	try {
		const { code, oa_id } = req.query;
		console.log('authorizationCode: ', code);
		console.log('oaId: ', oa_id);
		const tokenData = await zaloService.exchangeToken(code, 'get');

		return res.status(200).send({
			errorCode: 0,
			message: 'succesfull',
			errors: [],
		});
	} catch (error) {
		next(error);
	}
};
