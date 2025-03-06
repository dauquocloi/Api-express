const UseCase = require('../cores/files');
var XLSX = require('xlsx');
var workBook = XLSX.readFile('D:excelData/tempData.xlsx');
let workSheet = workBook.Sheets[workBook.SheetNames[0]];
const fs = require('fs');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const path = require('path');

const templatePath = 'template.docx';
const outputPath = 'output.docx';

exports.upLoadImages = (req, res) => {
	var data = req.file;
	console.log('[routers/files<upLoadImages>req.files: ', data);
	UseCase.upLoadImages(data, (err, result) => {
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
				message: 'upLoadImages succesfull',
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
