const fs = require('fs');
const path = require('path');
const util = require('util');
const { exec } = require('child_process');
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

module.exports = convertDocxToPdfCLI;
