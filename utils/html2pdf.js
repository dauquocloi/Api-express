const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function htmlToPdf(htmlPath, outputPdfPath) {
	const browser = await puppeteer.launch({
		headless: 'new',
	});

	const page = await browser.newPage();

	// load file html local
	await page.goto(`file://${htmlPath}`, {
		waitUntil: 'networkidle0',
	});

	await page.pdf({
		path: outputPdfPath,
		format: 'A4',
		printBackground: true,
	});

	await browser.close();
}

module.exports = htmlToPdf;
