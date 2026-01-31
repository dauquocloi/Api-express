const Services = require('../../service');

exports.getAll = async () => await Services.banks.getAll();
