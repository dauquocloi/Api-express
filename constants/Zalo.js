const OAUrls = {
	GET_ACCESS_TOKEN: '/v4/oa/access_token',
};

const ZNSUrls = {
	GET_TEMPLATES: '/template/all',
	GET_TEMPLATE_DETAIL: '/template/info/v2',
	SEND_MESSAGE: '/message/template',
};

const ZNSTemplateIds = {
	OTP: 528116,
	NEW_INVOICE: 491006,
};

module.exports = {
	OAUrls,
	ZNSUrls,
	ZNSTemplateIds,
};
