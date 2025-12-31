const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Contracts = require('./contracts');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');
const router = express.Router();

router.use(authentication);

router.get('/pdf-url', validator(schema.getContractSignedUrl, ValidateSource.QUERY), Contracts.getContractPdfSignedUrl);

router.post('/', authorization(ROLES['OWNER'], ROLES['MANAGER']), validator(schema.createContract, ValidateSource.BODY), Contracts.generateContract);

router.post('/workflow/prepare', validator(schema.generatePrepareContract, ValidateSource.BODY), Contracts.prepareGenerateContract);

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
