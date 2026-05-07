const { client: s3, region, bucketName } = require('../config').S3;
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

const deleteFileFromS3 = async (key) => {
	try {
		const command = new DeleteObjectCommand({
			Bucket: bucketName,
			Key: key,
		});

		const response = await s3.send(command);

		console.log('Delete success:', response);
		return true;
	} catch (error) {
		console.error('Delete error:', error);
		throw new Error(error.message);
	}
};

module.exports = deleteFileFromS3;
