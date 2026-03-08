const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

let browser;
let pagePool = [];
const MAX_POOL_SIZE = 2;

async function getBrowserInstance() {
	if (!browser) {
		browser = await puppeteer.launch({
			headless: 'new',
			args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
		});

		const warmPage = await browser.newPage();
		pagePool.push(warmPage);
	}
	return browser;
}

async function getPage() {
	if (pagePool.length > 0) {
		return pagePool.pop();
	}
	const b = await getBrowserInstance();
	return await b.newPage();
}

function releasePage(page) {
	if (pagePool.length < MAX_POOL_SIZE) {
		pagePool.push(page);
	} else {
		page.close();
	}
}

function fillCCCDNumber(htmlContent, cccdNumber, mode = 'req') {
	let updatedHtml = htmlContent;

	// Ép kiểu về String trước khi xử lý để giữ số 0 ở đầu
	const cccdStr = String(cccdNumber || '');
	const idStr = cccdStr.padEnd(12, ' ').substring(0, 12);

	for (let i = 0; i < 12; i++) {
		const digit = idStr[i].trim() === '' ? '&nbsp;' : idStr[i];
		const placeholder = mode === 'req' ? `{{CCCD${i}}}` : `{{OWNER_CCCD${i}}}`;

		// Dùng split/join để thay thế chính xác toàn bộ placeholder
		updatedHtml = updatedHtml.split(placeholder).join(digit);
	}

	return updatedHtml;
}

function replaceHtmlData(
	htmlContent,
	{ sendTo, reqFullName, birthDay, gender, reqCCCD, ownerCCCD, phone, email = null, ownerName, relationship, roomIndex, buildingAddress },
) {
	let updatedHtml = htmlContent;

	// PHẢI GÁN LẠI: updatedHtml = updatedHtml.replace(...)
	updatedHtml = updatedHtml.replace('{{SEND_TO}}', sendTo || '');
	updatedHtml = updatedHtml.replace('{{FULL_NAME}}', reqFullName || ''); // Lưu ý: Sửa '{{FULL_NAME' thành '{{FULL_NAME}}'
	updatedHtml = updatedHtml.replace('{{BIRTH_DAY}}', birthDay || '');
	updatedHtml = updatedHtml.replace('{{GENDER}}', gender || '');

	// Đoạn này bạn đã làm đúng nên nó chạy được
	updatedHtml = fillCCCDNumber(updatedHtml, reqCCCD, 'req');
	updatedHtml = fillCCCDNumber(updatedHtml, ownerCCCD, 'owner');

	// Tiếp tục gán lại cho các trường còn lại
	updatedHtml = updatedHtml.replace('{{PHONE}}', phone || '');
	updatedHtml = updatedHtml.replace('{{EMAIL}}', email || '');
	updatedHtml = updatedHtml.replace('{{OWNER_NAME}}', ownerName || '');
	updatedHtml = updatedHtml.replace('{{RELATIONSHIP}}', relationship || '');
	updatedHtml = updatedHtml.replace('{{ROOM_INDEX}}', roomIndex || '');
	updatedHtml = updatedHtml.replace('{{ADDRESS}}', buildingAddress || '');

	return updatedHtml;
}

function generateCT01Html(htmlPath, data) {
	console.log('log of data: ', data);
	htmlPath = 'C:\\Users\\Admin\\OneDrive\\Desktop\\Api-Express\\files\\CT01F.html';
	let htmlContent = fs.readFileSync(htmlPath, 'utf8');

	htmlContent = replaceHtmlData(htmlContent, data);

	// Tìm tên file CSS trong HTML
	const cssMatch = htmlContent.match(/href=["']([^"']+\.css)["']/i);

	if (cssMatch) {
		const cssFileName = cssMatch[1];
		const cssPath = path.join(path.dirname(htmlPath), cssFileName);

		console.log('📁 HTML path:', htmlPath);
		console.log('📁 CSS path:', cssPath);
		console.log('📁 CSS exists:', fs.existsSync(cssPath));

		if (fs.existsSync(cssPath)) {
			const cssContent = fs.readFileSync(cssPath, 'utf8');

			// Xóa thẻ <link> cũ và thêm <style> inline
			htmlContent = htmlContent.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, `<style>${cssContent}</style>`);

			console.log('✅ CSS đã được inline');
		} else {
			console.warn('⚠️ Không tìm thấy file CSS:', cssPath);
		}
	}

	return htmlContent;
}

async function htmlToPdf(htmlContent) {
	let page;
	const startTime = Date.now();

	try {
		page = await getPage();

		await page.setContent(htmlContent, {
			waitUntil: 'domcontentloaded',
			timeout: 10000,
		});

		const convertPdf = await page.pdf({
			format: 'A4',
			printBackground: true,
			preferCSSPageSize: true,
			displayHeaderFooter: false,
			margin: { top: 0, right: 0, bottom: 0, left: 0 },
		});

		const pdfBuffer = Buffer.from(convertPdf, 'base64');

		console.log(Buffer.isBuffer(pdfBuffer));

		console.log(`✅ PDF generated in ${Date.now() - startTime}ms`);

		return pdfBuffer;
	} catch (error) {
		console.error('❌ Lỗi:', error);
		throw error;
	} finally {
		if (page) releasePage(page);
	}
}

process.on('SIGINT', async () => {
	if (browser) {
		await browser.close();
		browser = null;
	}
	process.exit(0);
});

module.exports = { htmlToPdf, generateCT01Html };
