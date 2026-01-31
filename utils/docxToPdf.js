const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const libre = require('libreoffice-convert');
const fs = require('fs');
const util = require('util');
const libreConvert = util.promisify(libre.convert);

/**
 * Tạo PDF từ Word template với data động
 * @param {Buffer} templateBuffer - File .docx template
 * @param {Object} data - Dữ liệu để điền vào template
 * @returns {Promise<{buffer: Buffer, mimetype: string, size: number}>}
 */
async function generateContractPdf(templateBuffer, data) {
	if (!templateBuffer || templateBuffer.length === 0) {
		throw new Error('Template buffer không được rỗng');
	}

	try {
		// Bước 1: Load template và render data
		const zip = new PizZip(templateBuffer);
		const doc = new Docxtemplater(zip, {
			paragraphLoop: true,
			linebreaks: true,
			nullGetter: () => '', // Xử lý giá trị null/undefined
		});

		// Điền data vào template
		doc.render(data);

		// Tạo buffer DOCX đã điền data
		const docxBuffer = doc.getZip().generate({
			type: 'nodebuffer',
			compression: 'DEFLATE',
		});

		// Bước 2: Convert DOCX sang PDF (nhanh hơn LibreOffice CLI)
		const pdfBuffer = await libreConvert(docxBuffer, '.pdf', undefined);

		return {
			buffer: pdfBuffer,
			mimetype: 'application/pdf',
			size: pdfBuffer.length,
			// originalName: 'contract.pdf',
		};
	} catch (error) {
		if (error.properties && error.properties.errors) {
			// Lỗi từ docxtemplater (thiếu field trong template)
			const firstError = error.properties.errors[0];
			throw new Error(`Template error: ${firstError.message} at ${firstError.name}`);
		}
		throw new Error(`Tạo PDF thất bại: ${error.message}`);
	}
}

/**
 * Wrapper đơn giản: Convert DOCX buffer sang PDF buffer
 */
async function convertDocxToPdf(docxBuffer) {
	return generateContractPdf(docxBuffer, {});
}

// ========== USAGE EXAMPLE ==========

module.exports = {
	generateContractPdf,
	docxToPdf: convertDocxToPdf,
};
