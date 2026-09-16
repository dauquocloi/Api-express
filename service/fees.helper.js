const { feeUnit } = require('../constants/');
const Services = require('./index');
const { ConflictError } = require('../AppError');
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

exports.formatFeeIndexRecords = (listFees) =>
	listFees
		.map((fee) =>
			fee.unit === feeUnit['INDEX']
				? {
						feeKey: fee.feeKey,
						lastIndex: fee.firstIndex,
				  }
				: null,
		)
		.filter((fee) => fee !== null);

exports.getChangedFeeIndexes = (oldFees = [], newFees = []) => {
	const oldFeeMap = new Map(oldFees.filter((fee) => fee.unit === feeUnit['INDEX']).map((fee) => [fee.feeKey, fee]));

	const changedFeeMap = new Map();

	for (const newFee of newFees) {
		if (newFee.unit !== feeUnit['INDEX']) continue;

		const oldFee = oldFeeMap.get(newFee.feeKey);

		if (!oldFee) continue;

		if (oldFee.lastIndex !== newFee.lastIndex) {
			changedFeeMap.set(newFee.feeKey, {
				fromIndex: oldFee.lastIndex,
				toIndex: newFee.lastIndex,
			});
		}
	}

	return changedFeeMap;
};

exports.createFeeIndexRecordsFromChangedFees = async ({ changedFeeMap, editorId, roomId, fromSource }) => {
	if (changedFeeMap.size === 0) {
		return;
	}

	const feeKeys = [...changedFeeMap.keys()];

	const fees = await Services.fees.findByRoomIdAndFeeKey(roomId, feeKeys);

	const feeMap = new Map(fees.map((fee) => [fee.feeKey, fee]));

	const records = [...changedFeeMap.entries()].map(([feeKey, { fromIndex, toIndex }]) => {
		const fee = feeMap.get(feeKey);

		if (!fee) {
			throw new ConflictError(`Fee not found: ${feeKey}`);
		}

		return {
			feeId: fee._id,
			fromIndex,
			toIndex,
			editorId,
			roomId,
			fromSource,
		};
	});

	const result = await Services.fees.generateFeeIndexRecords(records);
	return result;
};

exports.getFeeIndexesForRollback = (feeIndexSnapshot = [], currentFees = []) => {
	const snapshotMap = new Map(feeIndexSnapshot.map((fee) => [fee.feeKey, fee]));

	const rollbackFeeMap = new Map();

	for (const fee of currentFees) {
		const snapshot = snapshotMap.get(fee.feeKey);

		if (!snapshot) continue;

		if (fee.lastIndex !== snapshot.lastIndex) {
			rollbackFeeMap.set(fee.feeKey, {
				fromIndex: fee.lastIndex,
				toIndex: snapshot.lastIndex,
			});
		}
	}

	return rollbackFeeMap;
};
