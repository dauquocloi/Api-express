const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const convertDocxToPdf = require('./convertDocxToPdf');
const Entity = require('../models');
const withSignedUrl = require('./withSignedUrls');
const uploadFile = require('./uploadFile');
const expressionParser = require('docxtemplater/expressions.js');
const getOriginalFile = require('./getOriginalFile');

async function generatePdfContract(data, buildingObjectId) {
	const templatePath = await Entity.BuildingsEntity.findOne({ _id: buildingObjectId }, { contractDocxUrl: 1 });
	if (!templatePath || !templatePath.contractDocxUrl) throw new Error(`Tòa nhà với id ${buildingObjectId} không tồn tại`);
	const contractDocxBuffer = await getOriginalFile(templatePath?.contractDocxUrl);
	const zip = new PizZip(contractDocxBuffer);
	const doc = new Docxtemplater(zip, {
		paragraphLoop: true,
		linebreaks: true,
		parser: expressionParser,
	});

	try {
		doc.render(data);
		const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });
		const pdfContract = await convertDocxToPdf(docxBuffer);
		console.log('log of pdfContract after generateContract: ', pdfContract);
		const uploadPdfContract = await uploadFile(pdfContract);

		return uploadPdfContract;
	} catch (error) {
		console.error('Lỗi trong quá trình ghi dữ liệu hợp đồng:', error.message);
		throw error;
	}
}

module.exports = generatePdfContract;
