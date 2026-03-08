const isValidImage = (file) => {
	if (!file) return false;

	return file.mimetype && file.mimetype.startsWith('image/');
};

module.exports = { isValidImage };
