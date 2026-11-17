const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const Services = require('../service');
const expressionParser = require('docxtemplater/expressions.js');
const getOriginalFile = require('./getOriginalFile');
const crypto = require('crypto');

const docxToPdf = require('./docxToPdf');

async function generatePdfDeposit(data, buildingObjectId) {
	console.log('log of data in generatePdfDeposit: ', data);
	try {
		// 1. Lấy đường dẫn template từ database
		const templatePath = await Services.buildings.findById(buildingObjectId).select('depositDocxUrl').lean().exec();

		console.log('log of templatePath in generatePdfDeposit: ', templatePath);

		if (!templatePath || !templatePath.depositDocxUrl) {
			throw new Error(`Tòa nhà với id ${buildingObjectId} không tồn tại hoặc thiếu template`);
		}

		// 2. Tải file template DOCX
		const depositDocxBuffer = await getOriginalFile(templatePath.depositDocxUrl);

		console.log('log of depositDocxBuffer in generatePdfDeposit: ', depositDocxBuffer);

		// 3. Render dữ liệu vào template
		const zip = new PizZip(depositDocxBuffer);
		const doc = new Docxtemplater(zip, {
			paragraphLoop: true,
			linebreaks: true,
			parser: expressionParser,
			nullGetter: () => '',
		});

		doc.render(data);

		// 4. Tạo DOCX buffer sau khi render
		const docxBuffer = doc.getZip().generate({
			type: 'nodebuffer',
			compression: 'DEFLATE',
		});

		// 5. Convert DOCX sang PDF
		const pdfBuffer = await docxToPdf(docxBuffer);

		//6. Filename
		const unitId = crypto.randomUUID();
		const originalName = `${unitId}.pdf`;

		const fileObject = {
			buffer: pdfBuffer,
			mimetype: 'application/pdf',
			originalname: originalName,
		};

		return fileObject;
	} catch (error) {
		// Xử lý lỗi từ docxtemplater
		if (error.properties && error.properties.errors) {
			const firstError = error.properties.errors[0];
			throw new Error(`Template error: ${firstError.message} tại field ${firstError.name}`);
		}

		throw new Error(`Tạo PDF hợp đồng thất bại: ${error.message}`);
	}
}

module.exports = generatePdfDeposit;
