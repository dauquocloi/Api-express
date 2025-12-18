const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Fees = require('./fees');
const authentication = require('../../auth/authentication');

const router = express.Router();

// router.use(authentication);
router.post('/', Fees.addFee);
router.patch('/:feeId', Fees.editFee);
router.delete('/:feeId', Fees.deleteFee);
router.get('/initial', Fees.getFeeInitial);

module.exports = router;
