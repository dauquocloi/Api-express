const Entity = require('../models');

exports.findById = (bankId) => Entity.BanksEntity.findById(bankId);

exports.getAll = () => Entity.BanksEntity.find({});
