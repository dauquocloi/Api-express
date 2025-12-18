const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Deposits = require('./deposits');
const authentication = require('../../auth/authentication');

const router = express.Router();

// router.use(authentication);
router.get('/', Deposits.getDeposits);
router.get('/:depositId', validator(schema.id, ValidateSource.PARAM), Deposits.getDepositDetail);
router.post('/:depositId', validator(schema.createDeposit, ValidateSource.BODY), Deposits.createDeposit);
router.patch('/:depositId', validator(schema.id, ValidateSource.PARAM), validator(schema.createDeposit, ValidateSource.BODY), Deposits.modifyDeposit);
router.delete('/:depositId', validator(schema.id, ValidateSource.PARAM), Deposits.terminateDeposit);
router.post('/:depositId/deposit-term', validator(schema.id, ValidateSource.PARAM), Deposits.uploardDepositTerm);

module.exports = router;
