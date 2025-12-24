const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Revenues = require('./revenues');
const authentication = require('../../auth/authentication');

const router = express.Router();
router.use(authentication);
router.get('/', validator(schema.getAllRevenues, ValidateSource.QUERY), Revenues.getRevenues);
router.get('/fees', validator(schema.getFees, ValidateSource.QUERY), Revenues.getTotalFeeRevenue);

module.exports = router;
