// middleware/parseFormDataFields.js
const parseFormDataFields = (req, res, next) => {
	console.log('log of req from parseFormDataFields: ', req.body);
	try {
		if (req.body.performers) {
			req.body.performers = JSON.parse(req.body.performers);
		}

		if (req.body.executionDate) {
			const date = new Date(req.body.executionDate);
			if (isNaN(date.getTime())) {
				throw new Error('Invalid executionDate format');
			}
			req.body.executionDate = date;
		}

		if (req.body.taskContent) {
			req.body.taskContent = req.body.taskContent.trim();
		}
		if (req.body.detail) {
			req.body.detail = req.body.detail.trim();
		}

		next();
	} catch (error) {
		return res.status(400).json({
			error: 'Invalid form data format',
			message: error.message,
		});
	}
};

module.exports = { parseFormDataFields };
