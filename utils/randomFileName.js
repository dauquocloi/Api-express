const CryptoJS = require('crypto-js');
const path = require('path');

function randomFileName(originalName) {
	try {
		// console.log(originalName);
		// const ext = path.extname(originalName);
		const randomHex = (byte = 32) => CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
		// throw new Error('Lỗi');
		return `${randomHex()}.jpg`;
	} catch (error) {
		return new Error(error.message);
	}
}

module.exports = randomFileName;
