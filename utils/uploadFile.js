const generateRandomFileName = require('./randomFileName');
const optimizedImage = require('./optimizeImage');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const uploadFile = async (filePath) => {
	try {
		const s3 = new S3Client({
			credentials: {
				accessKeyId: process.env.ACCESS_KEY,
				secretAccessKey: process.env.SECRET_ACCESS_KEY,
			},
			region: process.env.BUCKET_REGION,
		});

		let randomFileName = generateRandomFileName(filePath.originalname);
		let fileBuffer;
		console.log('log of randomFileName: ', randomFileName);

		if (filePath.mimetype?.startsWith('image/')) {
			fileBuffer = await optimizedImage(filePath.buffer); // tối ưu ảnh
		} else {
			fileBuffer = filePath.buffer; // giữ nguyên file gốc (vd: PDF)
		}

		const params = {
			Bucket: process.env.BUCKET_NAME,
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
			url: `https://${process.env.BUCKET_NAME}.s3.${process.env.BUCKET_REGION}.amazonaws.com/${randomFileName}`,
		};
	} catch (error) {
		throw new Error(error.message);
	}
};

module.exports = uploadFile;
