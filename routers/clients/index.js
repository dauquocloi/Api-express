const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Clients = require('./clients');
const router = express.Router();

router.get('/contracts', validator(schema.getContractInfo, ValidateSource.QUERY), Clients.getContractInfo);

router.get('/bills', validator(schema.getBill, ValidateSource.QUERY), Clients.getBillInfo);

router.patch(
	'/contracts/:contractId/workflow/confirmation',
	validator(schema.contractId, ValidateSource.PARAM),
	validator(schema.confirmationContract, ValidateSource.BODY),
	Clients.confirmationContract,
);

router.post(
	'/contracts/:contractId/request-confirm-otp',
	validator(schema.contractId, ValidateSource.PARAM),

	Clients.requestConfirmContractOtp,
);

module.exports = router;
