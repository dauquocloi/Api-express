const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Contracts = require('./contracts');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const router = express.Router();
const { checkIdempotency } = require('../../middleware/idempotency');
const RESOURCE = 'contracts';

router.get(
	'/customer/contract-pdf-url',
	validator(schema.customerGetContractPdfUrl, ValidateSource.QUERY),
	Contracts.getContractPdfUrlByCustomerPhone,
);

//==============//
router.use(authentication);
//==============//

router.get(
	'/pdf-url',
	validator(schema.getContractSignedUrl, ValidateSource.QUERY),
	checkResourceAccess(RESOURCE),
	Contracts.getContractPdfSignedUrl,
);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.createContract, ValidateSource.BODY),
	Contracts.generateContract,
);

router.post(
	'/workflow/prepare',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.generatePrepareContract, ValidateSource.BODY),
	Contracts.prepareGenerateContract,
);

router.patch(
	'/:contractId/workflow/set-move-out-date',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.setMoveOutDate, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Contracts.setExpectedMoveOutDate,
);

router.patch(
	'/:contractId/workflow/cancel-terminate-early',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.cancelTerminateEarly, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Contracts.cancelIsEarlyTermination,
);

router.patch(
	'/:contractId/workflow/terminate-early',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.terminateEarly, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Contracts.terminateContractUnRefund,
);

router.patch(
	'/:contractId/workflow/contract-extention',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.contractExtention, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Contracts.contractExtention,
);

module.exports = router;
