const generateRandomFileName = require('./randomFileName');
const optimizedImage = require('./optimizeImage');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { client: s3, bucketName, region } = require('../config').S3;

const uploadFile = async (filePath) => {
	console.log('log of filePath in uploadFile util: ', filePath);
	try {
		let randomFileName = generateRandomFileName(filePath.originalname);
		let fileBuffer;

		if (filePath.mimetype?.startsWith('image/')) {
			fileBuffer = await optimizedImage(filePath.buffer); // giảm kích thước và độ nét
		} else {
			fileBuffer = filePath.buffer;
		}

		const params = {
			Bucket: bucketName,
			Key: randomFileName,
			Body: fileBuffer,
			ContentType: filePath.mimetype,
			ContentDisposition: 'inline',
			ACL: 'public-read', // go public to read
		};

		const command = new PutObjectCommand(params);
		const sendFile = await s3.send(command);

		return {
			...sendFile,
			Key: randomFileName,
			url: `https://${bucketName}.s3.${region}.amazonaws.com/${randomFileName}`,
		};
	} catch (error) {
		console.log('Lỗi trong quá trình upload image: ', error);
		throw new Error(error.message);
	}
};

module.exports = uploadFile;
