const crypto = require('crypto');

/**
 * Generate a deterministic SHA-256 hash for request idempotency.
 *
 * Important:
 * - Same logical input => same hash
 * - Different logical input => different hash
 * - Object key order does not affect the hash
 * - Undefined values are normalized
 * - Supports nested objects and arrays
 */
const generateRequestHash = (payload) => {
	const normalize = (value) => {
		if (value === undefined) {
			return null;
		}

		if (value === null) {
			return null;
		}

		if (value instanceof Date) {
			return value.toISOString();
		}

		if (Buffer.isBuffer(value)) {
			return value.toString('base64');
		}

		if (Array.isArray(value)) {
			return value.map(normalize);
		}

		if (typeof value === 'object') {
			return Object.keys(value)
				.sort()
				.reduce((result, key) => {
					result[key] = normalize(value[key]);
					return result;
				}, {});
		}

		return value;
	};

	const normalizedPayload = normalize(payload);

	const serialized = JSON.stringify(normalizedPayload);

	return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
};

module.exports = generateRequestHash;
