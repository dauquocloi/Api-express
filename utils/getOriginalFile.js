const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { client: s3 } = require('../config').S3;

const getOriginalFile = async (Key) => {
	const objectParams = {
		Bucket: process.env.BUCKET_NAME,
		Key,
	};

	try {
		const command = new GetObjectCommand(objectParams);

		const data = await s3.send(command);

		// AWS SDK v3 trả về Readable Stream thay vì Buffer
		const chunks = [];

		for await (const chunk of data.Body) {
			chunks.push(chunk);
		}

		return Buffer.concat(chunks);
	} catch (err) {
		console.error('S3 getObject error:', err);
		throw err;
	}
};

module.exports = getOriginalFile;
