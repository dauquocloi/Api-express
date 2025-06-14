const generateRandomFileName = require('./randomFileName');
const optimizedImage = require('./optimizeImage');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const uploadImage = async (filePath) => {
	try {
		const s3 = new S3Client({
			credentials: {
				accessKeyId: process.env.ACCESS_KEY,
				secretAccessKey: process.env.SECRET_ACCESS_KEY,
			},
			region: process.env.BUCKET_REGION,
		});

		let randomImageName = generateRandomFileName(filePath.originalname);

		const optimizeImage = await optimizedImage(filePath.buffer);

		const params = {
			Bucket: process.env.BUCKET_NAME,
			Key: randomImageName,
			Body: optimizeImage,
			ContentType: 'image/jpeg',
			// ACL: 'public-read', // Cho phép công khai
		};
		console.log('params: ', params);
		const command = new PutObjectCommand(params);

		const sendFile = await s3.send(command);

		return { ...sendFile, Key: randomImageName };
	} catch (error) {
		throw new Error(error.message);
	}
};

module.exports = uploadImage;
