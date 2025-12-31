/**
 * @param {Array} feeIndexIds - Array of fee IDs
 * @param {Object} feeIndexValues - Object with fee IDs as keys
 */
const { BadRequestError } = require('../AppError');

exports.validateFeeIndexMatch = (feeIndexIds, feeIndexValues) => {
	// Check if feeIndexIds is array and not empty
	if (!Array.isArray(feeIndexIds) || feeIndexIds.length === 0) {
		throw new BadRequestError('feeIndexIds must be a non-empty array');
	}

	// Check if feeIndexValues is object and not empty
	if (!feeIndexValues || typeof feeIndexValues !== 'object' || Object.keys(feeIndexValues).length === 0) {
		throw new BadRequestError('feeIndexValues must be a non-empty object');
	}

	// Get all keys from feeIndexValues
	const feeValueKeys = Object.keys(feeIndexValues);

	// Check if all feeIndexIds exist in feeIndexValues
	const missingKeys = feeIndexIds.filter((feeId) => !feeValueKeys.includes(feeId.toString()));
	if (missingKeys.length > 0) {
		throw new BadRequestError(`Fee IDs [${missingKeys.join(', ')}] do not have corresponding values in feeIndexValues`);
	}

	// Check if all keys in feeIndexValues exist in feeIndexIds
	const extraKeys = feeValueKeys.filter((key) => !feeIndexIds.includes(key));
	if (extraKeys.length > 0) {
		throw new BadRequestError(`feeIndexValues contains extra keys [${extraKeys.join(', ')}] not in feeIndexIds`);
	}

	// Check if all values have required properties
	feeValueKeys.forEach((key) => {
		const value = feeIndexValues[key];
		if (!value || typeof value !== 'object') {
			throw new BadRequestError(`feeIndexValues[${key}] must be an object`);
		}
		if (value.secondIndex === undefined || value.secondIndex === null) {
			throw new BadRequestError(`feeIndexValues[${key}] is missing secondIndex`);
		}
	});

	return true;
};
