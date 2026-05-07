const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { client: s3, bucketName } = require('../config').S3;

const getFileUrl = async (Key) => {
	try {
		const getObjectParams = {
			Bucket: bucketName,
			Key: Key, // file Name from s3
		};

		const command = new GetObjectCommand(getObjectParams);
		const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

		return url;
	} catch (error) {
		throw error;
	}
};

module.exports = getFileUrl;
