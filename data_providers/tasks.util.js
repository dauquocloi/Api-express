const uploadFile = require('../utils/uploadFile');
const deleteFileFromS3 = require('../utils/deleteFileFromS3');

exports.uploadTaskImages = async (images = []) => {
	if (!Array.isArray(images) || images.length === 0) {
		return [];
	}

	const uploadResults = await Promise.all(images.map((image) => uploadFile(image)));

	return uploadResults.map((result) => result.Key);
};

exports.deleteTaskImages = async (imageKeys = []) => {
	if (!Array.isArray(imageKeys) || imageKeys.length === 0) {
		return;
	}

	const results = await Promise.allSettled(imageKeys.map((key) => deleteFileFromS3(key)));

	const failed = results.filter((result) => result.status === 'rejected');

	if (failed.length > 0) {
		console.error(
			`Failed to cleanup ${failed.length}/${imageKeys.length} task images`,
			failed.map((result) => result.reason),
		);
	}
};
