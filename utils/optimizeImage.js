const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const optimizedImage = async (filePath) => {
	try {
		// Tối ưu hóa hình ảnh với sharp
		const optimizedImageBuffer = await sharp(filePath)
			.resize({ width: 800, height: 600, fit: 'inside' }) // Giảm kích thước, giữ tỷ lệ
			.toFormat('jpeg')
			.jpeg({ quality: 80 })
			.toBuffer();

		return optimizedImageBuffer;
	} catch (error) {
		return new Error(error);
	}
};

module.exports = optimizedImage;
