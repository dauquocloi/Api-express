const CryptoJS = require('crypto-js');
const path = require('path');

function randomFileName(originalName) {
	try {
		const ext = path.extname(originalName) || '.bin'; // fallback nếu không có đuôi
		const randomHex = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
		return `${randomHex}${ext}`;
	} catch (error) {
		throw new Error(error.message);
	}
}

module.exports = randomFileName;
