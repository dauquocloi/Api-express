const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const convertDocxToPdf = require('./convertDocxToPdf');

// function generateDocx(data, outputPath) {
// 	const templatePath = 'D:contract/mau-hop-dong-cho-thue-nha-tro.docx';

// 	const content = fs.readFileSync(templatePath, 'binary');
// 	const zip = new PizZip(content);

// 	const doc = new Docxtemplater(zip, {
// 		paragraphLoop: true,
// 		linebreaks: true,
// 	});

// 	try {
// 		doc.render(data);
// 	} catch (error) {
// 		console.error('Error rendering document:', error.message);
// 		throw error;
// 	}

// 	const buffer = doc.getZip().generate({ type: 'nodebuffer' });

// 	fs.writeFileSync(outputPath, buffer);
// }

// const contracts = [
// 	{
// 		DAY: '07',
// 		MONTH: '05',
// 		YEAR: '2025',
// 		BUILDING_ADDRESS: '217/102/18 Bùi Đình Túy phường 24 quận Bình Thạnh HCM',
// 		TEMPORARY_RESIDENT_A: '105 thôn 13 xã Eak Tiêu huyện Cư Kuin tỉnh Đăk Lăk',
// 		OWER_B_NAME: 'Quỳnh Như Hoàng Dương',
// 		OWNER_B_DOB: '14/03/2003',
// 		TEMPORARY_RESIDENT_B: '217/9/23 Bùi Đình Túy, phường 24, quận Bình Thạnh, HCM',
// 		OWNER_B_CMND: '0056999792458',
// 		CMND_DATE_B: '13/10/2021',
// 		CMND_AD_B: 'Ca tỉnh Đăk Lăk',
// 		OWNER_B_PHONE: '0834238589',
// 		ROOM_PRICE: '5.500.000',
// 		DEPOSIT: '5.500.000',
// 		FEES: [
// 			{
// 				FEE_NAME_1: 'tiền điện',
// 				FEE_AMOUNT_1: '4.000',
// 				FEE_TYPE_1: 'kWh/số',
// 			},
// 			{
// 				FEE_NAME_1: 'tiền nước',
// 				FEE_AMOUNT_1: '23.000',
// 				FEE_TYPE_1: '/khối nước',
// 			},
// 			{
// 				FEE_NAME_1: 'tiền dịch vụ',
// 				FEE_AMOUNT_1: '160.000',
// 				FEE_TYPE_1: '/phòng',
// 			},
// 		],
// 		FROM_DAY: '07',
// 		FROM_MONTH: '05',
// 		FROM_YEAR: '2025',
// 		TO_DAY: '30',
// 		TO_MONTH: '05',
// 		TO_YEAR: '2026',
// 	},
// ];

// contracts.forEach((data, i) => {
// 	const filename = `contract-${i + 1}.docx`;
// 	const outputPath = path.join('D:contract', filename);
// 	generateDocx(data, outputPath);
// 	console.log(`✔️ Generated: ${filename}`);
// });

const inputDocx = path.join('D:/contract', 'contract-1.docx');
const outputDir = path.join('D:/contract', 'output');

if (!fs.existsSync(inputDocx)) {
	console.error('❌ File DOCX không tồn tại tại đường dẫn:', inputDocx);
	process.exit(1);
}

convertDocxToPdf(inputDocx, outputDir)
	.then((pdfPath) => {
		console.log('✅ File PDF đã được tạo:', pdfPath);
		// Bạn có thể lưu `pdfPath` vào database tại đây
	})
	.catch((err) => {
		console.error('❌ Lỗi:', err.message);
	});
