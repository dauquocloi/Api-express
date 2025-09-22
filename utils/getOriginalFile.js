const AWS = require('aws-sdk');
const fs = require('fs');

const getOriginalFile = async (Key) => {
	const s3 = new AWS.S3({
		credentials: {
			accessKeyId: process.env.ACCESS_KEY,
			secretAccessKey: process.env.SECRET_ACCESS_KEY,
		},
		region: process.env.BUCKET_REGION,
	});

	const objectParams = {
		Bucket: process.env.BUCKET_NAME,
		Key: Key, // file Name from s3
	};

	try {
		const data = await s3.getObject(objectParams).promise();

		return data.Body; // Buffer
	} catch (err) {
		console.error('S3 getObject error:', err);
		throw err;
	}
};

module.exports = getOriginalFile;
