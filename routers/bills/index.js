const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Bills = require('./bills');
const router = express.Router();

router.get('/:billCode', validator(schema.getBill, ValidateSource.PARAM), Bills.getBillInfo);

module.exports = router;
