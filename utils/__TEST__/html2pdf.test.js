const { htmlToPdf, generateCT01Pdf } = require('../html2pdf'); // Import hàm từ file của bạn
const path = require('path');

const inputHtml = 'C:\\Users\\Admin\\OneDrive\\Desktop\\Api-Express\\files\\CT01F.html';
// const inputHtml = 'C:\\Users\\Admin\\OneDrive\\Desktop\\Api-Express\\files\\CT01B.html';
const outputPdf = path.join(__dirname, 'ketqua_CT01.pdf'); // Tên file đầu ra

(async () => {
	const htmlContent = generateCT01Pdf(inputHtml, { sendTo: 'Nguyen Van A' });
	console.time('Đang bắt đầu chuyển đổi...');
	await htmlToPdf(htmlContent, outputPdf);
	console.timeEnd('Đang bắt đầu chuyển đổi...');
})();
