const parseFormDataFields = (req, res, next) => {
	if (req.body.performers) {
		req.body.performers = JSON.parse(req.body.performers);
	}

	next();
};

module.exports = { parseFormDataFields };
