const getFileUrl = require('./getFileUrl');

async function withSignedUrls(doc, fieldName) {
	const obj = doc.toObject();

	if (obj[fieldName]) {
		obj[fieldName] = await getFileUrl(obj[fieldName]);
	}

	return obj;
}

module.exports = withSignedUrls;
