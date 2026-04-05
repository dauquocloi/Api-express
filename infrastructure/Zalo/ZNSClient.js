// ZNSClient.js
const { BaseZaloClient } = require('./BaseZaloClient');
const Services = require('../../service');
const { providers } = require('../../constants/OA');
const { zaloErrorTypes } = require('./ZaloError');

class ZNSClient extends BaseZaloClient {
	constructor(config) {
		super({
			...config,
			baseURL: process.env.ZNS_BASE_URL,

			isExpiredFn: (errorCode) => {
				return errorCode === zaloErrorTypes.ACCESS_TOKEN_INVALID;
			},
		});
	}
}

const znsClient = new ZNSClient({
	appId: process.env.ZALO_APP_ID,
	secretKey: process.env.ZALO_SECRET_KEY,
	tokenProvider: {
		get: async () => {
			return await Services.OA.getOAInfo(providers['ZALO']).lean().exec();
		},
		set: async ({ accessToken, refreshToken, expiredIn }) => {
			return await Services.OA.updateOAInfo({
				provider: providers['ZALO'],
				oaId: process.env.ZALO_APP_ID,
				accessToken,
				refreshToken,
				expiresIn: Number(expiredIn),
			});
		},
	},
});

module.exports = { znsClient };
