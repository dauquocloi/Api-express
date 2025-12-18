const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	id: Joi.object().keys({
		checkoutCostId: JoiObjectId().required(),
	}),
};
