const multer = require('multer');

const storage = multer.memoryStorage({
	filename: function (req, file, cb) {
		cb(null, file.originalname);
	},
});

const upload = multer({
	storage: storage,
	dest: 'uploards/',
});

module.exports = upload;
