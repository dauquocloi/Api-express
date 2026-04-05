// zns.service.js
const { znsClient } = require('../ZNSClient');
const { ZNSUrls } = require('../../../constants/Zalo');
const { ZaloError } = require('../ZaloError');

const getTemplates = async () => {
	return znsClient.request({
		method: 'GET',
		url: ZNSUrls['GET_TEMPLATES'],
		params: {
			offset: 0,
			limit: 100,
			status: 2,
			filterPreset: 1,
		},
	});
};

const sendZNS = async ({ phone, templateId, trackingId, templateData }) => {
	try {
		const result = await znsClient.request({
			method: 'POST',
			url: ZNSUrls['SEND_MESSAGE'],
			data: {
				phone,
				template_id: templateId,
				template_data: templateData,
				tracking_id: trackingId,
			},
		});
		console.log('ZNS send result: ', result.data);
		if (result.data.error !== 0) {
			const error = new Error(result.data?.message || 'Unknown error');
			error.response = {
				data: result.data,
				status: result.status,
			};
			throw error;
		}
		return result;
	} catch (error) {
		console.error('Error sending ZNS: ', error);
		const zaloError = ZaloError.fromAxiosError(error);

		ZaloError.handle(zaloError, {
			tags: {
				job: 'zns-new-invoice-noti-job',
			},
		});

		throw zaloError;
	}
};

module.exports = {
	sendZNS,
	getTemplates,
};
