const fs = require('fs');
const path = require('path');
const util = require('util');
const { exec } = require('child_process');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const Services = require('../service');
const expressionParser = require('docxtemplater/expressions.js');
const getOriginalFile = require('./getOriginalFile');
const uploadFile = require('./uploadFile');
const moment = require('moment');

const execPromise = util.promisify(exec);

async function convertDocxToPdfCLI(docxBuffer) {
	const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'contract-'));
	const inputPath = path.join(tempDir, 'input.docx');
	const outputPath = path.join(tempDir, 'input.pdf');

	try {
		fs.writeFileSync(inputPath, docxBuffer);

		const command = `soffice --headless --convert-to pdf "${inputPath}" --outdir "${tempDir}"`;
		await execPromise(command, {
			timeout: 15000,
			maxBuffer: 10 * 1024 * 1024,
		});

		if (!fs.existsSync(outputPath)) {
			throw new Error('File PDF không được tạo bởi LibreOffice');
		}

		const pdfBuffer = fs.readFileSync(outputPath);
		return pdfBuffer;
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
}

async function generatePdfContract(data, buildingObjectId) {
	try {
		// 1. Lấy đường dẫn template từ database
		const templatePath = await Services.buildings.findById(buildingObjectId).select('contractDocxUrl').lean().exec();

		if (!templatePath || !templatePath.contractDocxUrl) {
			throw new Error(`Tòa nhà với id ${buildingObjectId} không tồn tại hoặc thiếu template`);
		}

		// 2. Tải file template DOCX
		const contractDocxBuffer = await getOriginalFile(templatePath.contractDocxUrl);

		// 3. Render dữ liệu vào template
		const zip = new PizZip(contractDocxBuffer);
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
		const pdfBuffer = await convertDocxToPdfCLI(docxBuffer);

		//6. upload s3
		const originalName = `hop-dong-${moment().format('YYYYMMDD-HHmmss')}.pdf`;

		const fileObject = {
			buffer: pdfBuffer,
			mimetype: 'application/pdf',
			originalname: originalName,
		};
		const uploadResult = await uploadFile(fileObject);
		return uploadResult;
	} catch (error) {
		// Xử lý lỗi từ docxtemplater
		if (error.properties && error.properties.errors) {
			const firstError = error.properties.errors[0];
			throw new Error(`Template error: ${firstError.message} tại field ${firstError.name}`);
		}

		throw new Error(`Tạo PDF hợp đồng thất bại: ${error.message}`);
	}
}

module.exports = generatePdfContract;
