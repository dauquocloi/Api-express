const { GetObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const getFileUrl = async (Key) => {
	try {
		const s3 = new S3Client({
			credentials: {
				accessKeyId: process.env.ACCESS_KEY,
				secretAccessKey: process.env.SECRET_ACCESS_KEY,
			},
			region: process.env.BUCKET_REGION,
		});
		const getObjectParams = {
			Bucket: process.env.BUCKET_NAME,
			Key: Key, // file Name from s3
		};
		const command = new GetObjectCommand(getObjectParams);
		const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

		return url;
	} catch (error) {
		throw new Error(error.message);
	}
};

module.exports = getFileUrl;
