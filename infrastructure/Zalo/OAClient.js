// OAClient.js
const { BaseZaloClient } = require('./BaseZaloClient');
const Services = require('../../service');
const { providers } = require('../../constants/OA');

class OAClient extends BaseZaloClient {
	constructor(config) {
		super({
			...config,
			baseURL: process.env.OA_BASE_URL,

			isExpiredFn: (errorCode) => {
				return errorCode === -124;
			},
		});
	}
}

const oaClient = new OAClient({
	appId: process.env.ZALO_APP_ID,
	secretKey: process.env.ZALO_SECRET_KEY,
	tokenProvider: {
		get: async () => {
			return await Services.OA.getOAInfo(providers['ZALO']);
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

module.exports = { oaClient };
