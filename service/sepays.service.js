const Entity = require('../models');

exports.getSepayKey = async () => {
	return await Entity.SepaysEntity.findOne({}, { key: 1 });
};
