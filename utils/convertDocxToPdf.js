const path = require('path');
const fs = require('fs');
const os = require('os');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { randomUUID } = require('crypto');

// not used
async function convertDocxToPdf(docxBuffer) {
	if (!docxBuffer || docxBuffer.length === 0) {
		throw new Error('❌ Buffer đầu vào không được rỗng.');
	}

	let tempDir = null;
	let tempDocxPath = null; // Đường dẫn tới file .docx tạm

	try {
		// 1. Tạo thư mục tạm để chứa tất cả file
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-conversion-'));

		// 2. Tạo một file .docx tạm từ buffer đầu vào
		const tempDocxFilename = `${randomUUID()}.docx`;
		tempDocxPath = path.join(tempDir, tempDocxFilename);
		fs.writeFileSync(tempDocxPath, docxBuffer);

		// 3. Thực thi lệnh chuyển đổi với file .docx tạm
		const command = `soffice --headless --convert-to pdf "${tempDocxPath}" --outdir "${tempDir}"`;
		// SỬA ĐỔI QUAN TRỌNG: Lấy stdout và stderr để kiểm tra
		const { stdout, stderr } = await exec(command);
		await exec(command);
		if (stderr) {
			console.warn('[LibreOffice STDERR]', stderr); // Lỗi hoặc cảnh báo thường nằm ở đây
		}
		console.log('[LibreOffice STDOUT]', stdout);

		// 4. Xác định đường dẫn file PDF và đọc dữ liệu
		const pdfFilename = `${path.basename(tempDocxFilename, '.docx')}.pdf`;
		const outputPath = path.join(tempDir, pdfFilename);

		if (!fs.existsSync(outputPath)) {
			// Ném lỗi với thông tin từ stderr để biết nguyên nhân
			throw new Error(`Không tìm thấy file PDF output. Lỗi có thể từ LibreOffice: ${stderr}`);
		}

		const pdfBuffer = fs.readFileSync(outputPath);

		return {
			buffer: pdfBuffer,
			mimetype: 'application/pdf',
			originalname: pdfFilename,
			size: pdfBuffer.length,
			encoding: '7bit',
		};
	} catch (error) {
		console.error('Lỗi trong quá trình chuyển đổi:', error);
		throw new Error(`Chuyển đổi từ buffer sang PDF thất bại: ${error.message}`);
	} finally {
		// 5. Dọn dẹp TOÀN BỘ thư mục tạm (bao gồm cả file .docx và .pdf)
		if (tempDir) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	}
}

module.exports = convertDocxToPdf;
