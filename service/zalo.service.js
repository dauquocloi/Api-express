const axios = require('axios');
const qs = require('qs');
const Entity = require('../models');
const AppError = require('../AppError');
const crypto = require('crypto');

const ZALO_CHALLENGE_CODE = process.env.ZALO_CHALLENGE_CODE;
const ZALO_VERIFY_CODE = process.env.ZALO_VERIFY_CODE;
const ZALO_SECRET = process.env.ZALO_SECRET_KEY;
const ZALO_APP_ID = process.env.ZALO_APP_ID;

exports.exchangeToken = async (authCode, mode, next) => {
	try {
		if (mode === 'get') {
			const body = qs.stringify({
				code: authCode,
				app_id: ZALO_APP_ID,
				grant_type: 'authorization_code',
				code_verify: ZALO_VERIFY_CODE,
			});
			const response = await axios.post(`https://oauth.zaloapp.com/v4/oa/access_token`, body, {
				headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: ZALO_SECRET },
			});
			//should res like this:
			//{
			//     "access_token": "RfBh5NdqsWzhcX8bDDe_1A463Z34Fhy1GVi63AoTU1InwujqF",
			//     "refresh_token":"L2Y2BO9Prn_I1SkM08T4J99bZQYVbOBPfTVeRgrLdPK4ZqGX9G",
			//     "expires_in": "90000"
			// }

			console.log('log of res from exchangeToken: ', response.data);

			const existingToken = await Entity.OATokensEntity.findOne({ oaId: ZALO_APP_ID });

			if (existingToken) {
				existingToken.accessToken = response.data.access_token;
				existingToken.refreshToken = response.data.refresh_token;
				existingToken.expiresIn = Number(response.data.expires_in);
				existingToken.updatedAt = new Date();
				await existingToken.save();
			} else {
				const newToken = new Entity.OATokensEntity({
					oaId: ZALO_APP_ID,
					provider: 'zalo',
					accessToken: response.data.access_token,
					refreshToken: response.data.refresh_token,
					expiresIn: Number(response.data.expires_in),
				});
				await newToken.save();
			}

			return response.data;
		} else if (mode === 'refresh') {
			const tokenDoc = await Entity.OATokensEntity.findOne({ oaId: ZALO_APP_ID });
			if (!tokenDoc) throw new AppError(50001, 'Token chưa được khởi tạo!', 200);

			const body = qs.stringify({
				refresh_token: tokenDoc.refreshToken,
				app_id: ZALO_APP_ID,
				grant_type: 'refresh_token',
			});

			const response = await axios.post('https://oauth.zaloapp.com/v4/oa/access_token', body, {
				headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: ZALO_SECRET },
			});

			// DB updating
			tokenDoc.accessToken = response.data.access_token;
			tokenDoc.refreshToken = response.data.refresh_token;
			tokenDoc.expiresIn = Number(response.data.expires_in);
			tokenDoc.updatedAt = new Date();
			await tokenDoc.save();

			return response.data;
		}
	} catch (error) {
		next(error);
	}
};

exports.sendZNSInvoice = async (accessToken, reqData, next) => {
	console.log('log of reqData: ', reqData);
	try {
		const trackingId = `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

		const sendZNS = await axios.post(
			`https://business.openapi.zalo.me/message/template`,
			{
				phone: reqData.phone,
				template_id: process.env.ZALO_ZNS_CODE_INVOICE,
				template_data: {
					building_name: reqData.buildingName,
					amount: reqData.amount,
					bill_code: reqData.billCode,
					sender_name: reqData.senderName,
					customer_name: reqData.customerName,
					room_index: reqData.roomIndex,
					status: reqData.billStatus,
				},
			},
			{
				headers: {
					Content_Type: 'application/json',
					access_token: accessToken,
				},
			},
		);

		const { data, error } = sendZNS?.data || {};
		if (error !== 0) {
			throw new AppError(error, sendZNS.data.message, 200);
		}

		await Entity.ZaloZnsEntity.create({
			trackingId,
			sender: reqData.sender ?? 'Lợi gửi',
			sentAt: new Date(),
			templateId: process.env.ZALO_ZNS_CODE_INVOICE,
			toPhone: reqData.phone,
			sendingMode: data.sending_mode,
			status: 'fulfilled',
		});

		return {
			message: 'successfully',
			errorCode: 0,
		};
	} catch (error) {
		next(error);
	}
};
