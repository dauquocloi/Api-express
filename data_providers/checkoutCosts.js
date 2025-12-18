const mongoose = require('mongoose');
const Services = require('../service');

exports.getCheckoutCostDetail = async (checkoutCostId) => {
	const checkoutCostObjectId = mongoose.Types.ObjectId(checkoutCostId);

	const result = await Services.checkoutCosts.getCheckoutCostDetail(checkoutCostObjectId);

	return result;
};
