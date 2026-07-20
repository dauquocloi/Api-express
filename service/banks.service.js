const Entity = require('../models');
const { InternalError } = require('../AppError');

exports.findById = (bankId) => Entity.BanksEntity.findById(bankId);

exports.getAll = () => Entity.BanksEntity.find({});

exports.importBank = async ({ brandName, fullName, shortName, code, bin, logoPath, iconPath, active }, session = null) => {
	const [result] = await Entity.BanksEntity.create([
		{
			brandName,
			fullName,
			shortName,
			code,
			bin,
			logoPath,
			iconPath,
			active,
		},
	]);
	if (!result) throw new InternalError('Import bank fail');
	return result.toObject();
};
