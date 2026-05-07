const { InvalidInputError } = require('../AppError');

const validateDepositTermFile = (req, res, next) => {
	try {
		const file = req.file;

		if (!file) {
			next(new InvalidInputError('Vui lòng tải lên file'));
		}

		// Sai định dạng
		if (file.mimetype !== 'application/pdf') {
			next(new InvalidInputError('Chỉ chấp nhận định dạng PDF'));
		}

		next();
	} catch (error) {
		next(error);
	}
};

module.exports = validateDepositTermFile;
