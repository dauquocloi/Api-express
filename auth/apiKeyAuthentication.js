const crypto = require('crypto');
const Services = require('../service');
async function apiKeyAuth(req, res, next) {
	const apiKey = req.header('x-api-key');

	if (!apiKey) {
		return res.status(401).json({ error: 'Missing API Key' });
	}

	const hashed = crypto.createHash('sha256').update(apiKey).digest('hex');

	const key = await Services.sepays.getSepayKey({});
	if (key.key !== hashed) {
		return res.status(403).json({ error: 'Invalid API Key' });
	}

	next();
}

module.exports = apiKeyAuth;
