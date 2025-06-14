const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function convertDocxToPdf(inputPath, outputDir) {
	if (!fs.existsSync(inputPath)) {
		throw new Error('❌ File DOCX không tồn tại!');
	}
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	const input = `"${inputPath}"`;
	const outDir = `"${outputDir}"`;

	return new Promise((resolve, reject) => {
		const command = `soffice --headless --convert-to pdf ${input} --outdir ${outDir}`;
		console.log('[DEBUG] CMD:', command); // để debug

		exec(command, (error, stdout, stderr) => {
			console.log('[DEBUG] stdout:', stdout);
			console.log('[DEBUG] stderr:', stderr);
			if (error) {
				reject(new Error(`Chuyển đổi thất bại: ${stderr || error.message}`));
			} else {
				const pdfFilename = path.basename(inputPath, '.docx') + '.pdf';
				const outputPath = path.join(outputDir, pdfFilename);
				resolve(outputPath);
			}
		});
	});
}

module.exports = convertDocxToPdf;
