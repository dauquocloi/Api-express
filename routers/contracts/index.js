const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Contracts = require('./contracts');
const authentication = require('../../auth/authentication');

const router = express.Router();

// router.use(authentication);
router.get('/pdf-url', validator(schema.getContractSignedUrl, ValidateSource.QUERY), Contracts.getContractPdfSignedUrl);
router.post('/', Contracts.generateContract);
router.patch(
	'/:contractId/workflow/set-move-out-date',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.setMoveOutDate, ValidateSource.BODY),
	Contracts.setExpectedMoveOutDate,
);
router.patch(
	'/:contractId/workflow/cancel-terminate-early',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.cancelTerminateEarly, ValidateSource.BODY),
	Contracts.cancelIsEarlyTermination,
);

router.patch('/:contractId/workflow/terminate-early', validator(schema.id, ValidateSource.PARAM), Contracts.terminateContractUnRefund);

module.exports = router;
