const Joi = require('joi');
const { Types } = require('mongoose');
const { InvalidInputError } = require('../AppError');

const ValidateSource = {
	BODY: 'body',
	HEADER: 'headers',
	QUERY: 'query',
	PARAM: 'params',
};

const validator = (schema, source) => (req, res, next) => {
	try {
		const { error } = schema.validate(req[source]);

		if (!error) return next();

		const { details } = error;
		const message = details.map((i) => i.message.replace(/['"]+/g, '')).join(',');

		next(new InvalidInputError(message));
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

module.exports = {
	JoiAuthBearer,
	validator,
	ValidateSource,
	JoiObjectId,
};
