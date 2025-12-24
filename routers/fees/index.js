const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Fees = require('./fees');
const authentication = require('../../auth/authentication');

const router = express.Router();

router.use(authentication);
router.post('/', validator(schema.addFee, ValidateSource.BODY), Fees.addFee);
router.patch('/:feeId', validator(schema.id, ValidateSource.PARAM), validator(schema.editFee, ValidateSource.BODY), Fees.editFee);
router.delete('/:feeId', validator(schema.id, ValidateSource.PARAM), validator(schema.deleteFee, ValidateSource.BODY), Fees.deleteFee);
router.get('/initial', Fees.getFeeInitial);

module.exports = router;
