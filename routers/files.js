const UseCase = require('../cores/files');
var XLSX = require('xlsx');
var workBook = XLSX.readFile('D:excelData/tempData.xlsx');
let workSheet = workBook.Sheets[workBook.SheetNames[0]];
const fs = require('fs');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignaUrl } = require('@aws-sdk/s3-request-presigner');
const generateRandomFileName = require('../utils/randomFileName');
const optimizedImage = require('../utils/optimizeImage');

const templatePath = 'template.docx';
const outputPath = 'output.docx';

const s3 = new S3Client({
	credentials: {
		accessKeyId: process.env.ACCESS_KEY,
		secretAccessKey: process.env.SECRET_ACCESS_KEY,
	},
	region: process.env.BUCKET_REGION,
});

exports.uploadFiles = (req, res) => {
	var data = req.file;
	console.log('[routers/files<uploadFiles>req.files: ', data);
	UseCase.uploadFiles(data, (err, result) => {
		if (err) {
			return res.status(204).send({
				errorCode: 0,
				data: {},
				message: 'err',
				errors: [],
			});
		} else {
			return res.status(200).send({
				errorCode: 0,
				data: result,
				message: 'uploadFiles succesfull',
				errors: [],
			});
		}
	});
};

exports.readExcel = (req, res, next) => {
	for (let index = 2; index < 5; index++) {
		const buildingName = workSheet[`A${index}`].v;
		const buildingAdress = workSheet[`B${index}`].v;
		const ownerName = workSheet[`C${index}`].v;
		const roomQuantity = workSheet[`D${index}`].v;

		console.log({
			buildingName,
			buildingAdress,
			ownerName,
			roomQuantity,
		});
	}
	return res.status(204).send({
		errorCode: 0,
		data: {},
		message: 'temp',
		errors: [],
	});
};

exports.readDocx = (req, res, next) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'Vui lòng upload file Word' });
		}

		const filePath = req.file.path;
		const content = fs.readFileSync(filePath, 'binary');

		// Load file Word vào bộ nhớ
		const zip = new PizZip(content);
		const doc = new Docxtemplater(zip, {
			paragraphLoop: true,
			linebreaks: true,
		});

		// Dữ liệu cần thay thế
		doc.render({
			first_name: 'John',
			last_name: 'Doe',
			phone: '+33666666',
			description: 'The Acme Product',
		});

		// Ghi file mới
		const buffer = doc.getZip().generate({ type: 'nodebuffer' });
		const outputFile = path.join(__dirname, `output.docx`);
		console.log(__dirname);
		fs.writeFileSync(outputFile, buffer);
		res.status(202).send({
			message: 'success',
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

exports.importS3Iamge = async (req, res, next) => {
	try {
		console.log('log of file:', req);
		const { file } = req;

		let randomImageName = generateRandomFileName(req.file?.originalname);

		let fileBuffer;
		if (file.mimetype.startsWith('image/')) {
			fileBuffer = await optimizedImage(file.buffer); // tối ưu ảnh
		} else {
			fileBuffer = file.buffer; // giữ nguyên file gốc (vd: PDF)
		}

		const params = {
			Bucket: process.env.BUCKET_NAME,
			Key: randomImageName,
			Body: fileBuffer,
			ContentType: file.mimetype,
			ContentDisposition: 'inline',
			ACL: 'public-read', // go public to read
		};

		const command = new PutObjectCommand(params);
		const sendFile = await s3.send(command);

		res.send({
			message: 'success',
			data: {
				...sendFile,
				key: randomImageName,
				url: `https://${process.env.BUCKET_NAME}.s3.${process.env.BUCKET_REGION}.amazonaws.com/${randomImageName}`,
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.getSignaUrl = async (req, res, next) => {
	const getObjectParams = {
		Bucket: process.env.BUCKET_NAME,
		Key: '', // file Name from s3
	};
	const command = GetObjectCommand(getObjectParams);
	const url = await getSignaUrl(s3, command, { expiresIn: 3600 });
};
