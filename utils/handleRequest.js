export const handleRequest = async (serviceFunction, req, res, next, statusCode = 200) => {
	try {
		const data = await serviceFunction(req);
		return res.status(statusCode).send({
			errorCode: 0,
			data: data,
		});
	} catch (error) {
		next(error);
	}
};
