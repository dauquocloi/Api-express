const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const cloud = cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const images = ['./somepic.png', './views/mot.png', './views/hai.png', './views/ba.png', './views/bon.png', './views/nam.png'];

(async function run() {
	try {
		for (let image of images) {
			const result = await cloudinary.uploader.upload(image);
			console.log(result.secure_url);
		}
	} catch (error) {
		console.log(error);
	}
})();
