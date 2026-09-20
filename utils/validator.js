const Joi = require('joi');
const { Types } = require('mongoose');
const { InvalidInputError } = require('../AppError');

const ValidateSource = {
	BODY: 'body',
	HEADER: 'headers',
	QUERY: 'query',
	PARAM: 'params',
	FILE: 'file',
	FILES: 'files',
};

const sanitizeJoiError = (error) => {
	const detail = error.details?.[0];

	if (!detail) {
		return 'Dữ liệu đầu vào không hợp lệ';
	}

	switch (detail.type) {
		case 'any.only':
			return `"${detail.context?.key}" có giá trị không hợp lệ`;

		case 'any.required':
			return `"${detail.context?.key}" là bắt buộc`;

		case 'string.base':
			return `"${detail.context?.key}" phải là chuỗi`;

		case 'string.empty':
			return `"${detail.context?.key}" không được để trống`;

		case 'number.base':
			return `"${detail.context?.key}" phải là số`;

		case 'boolean.base':
			return `"${detail.context?.key}" phải là boolean`;

		default:
			return 'Dữ liệu đầu vào không hợp lệ';
	}
};

const validator = (schema, source) => (req, res, next) => {
	try {
		const { error, value } = schema.validate(req[source]);

		if (error) {
			const { details } = error;

			console.log('detail error:', details);

			// const message = details.map((i) => i.message.replace(/['"]+/g, '')).join(',');

			return next(new InvalidInputError(sanitizeJoiError(error)));
		}

		req[source] = value;

		return next();
	} catch (error) {
		next(error);
	}
};

const JoiAuthBearer = () =>
	Joi.string().custom((value, helpers) => {
		if (!value.startsWith('Bearer ')) return helpers.error('any.invalid');
		if (!value.split(' ')[1]) return helpers.error('any.invalid');
		return value;
	}, 'Authorization Header Validation');

const JoiObjectId = () =>
	Joi.string().custom((value, helpers) => {
		if (!Types.ObjectId.isValid(value)) return helpers.error('any.invalid');
		return value;
	}, 'Object Id Validation');

const JoiFile = (fieldName, mimeTypes = []) =>
	Joi.object({
		fieldname: Joi.string().valid(fieldName).required(),

		originalname: Joi.string().required(),

		mimetype:
			mimeTypes.length > 0
				? Joi.string()
						.valid(...mimeTypes)
						.required()
				: Joi.string().required(),

		size: Joi.number().positive().required(),
	}).unknown(true);

module.exports = {
	JoiAuthBearer,
	validator,
	ValidateSource,
	JoiObjectId,
	JoiFile,
};
