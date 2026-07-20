const Services = require('../../service');

exports.getAll = async () => await Services.banks.getAll();

exports.importBank = async ({ brandName, fullName, shortName, code, bin, logoPath, iconPath, active }) => {
	return await Services.banks.importBank({ brandName, fullName, shortName, code, bin, logoPath, iconPath, active });
};
