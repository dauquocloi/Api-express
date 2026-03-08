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
const { RESOURCES, VALIDATE_SOURCE: RESOURCE_VS } = require('../../constants/resources');
const { buildingPermissions: POLICY } = require('../../constants/buildings');

router.get(
	'/customer/contract-pdf-url',
	validator(schema.customerGetContractPdfUrl, ValidateSource.QUERY),
	Contracts.getContractPdfUrlByCustomerPhone,
);

//==============//
router.use(authentication);
//==============//

router.get('/pdf-url', validator(schema.getContractSignedUrl, ValidateSource.QUERY), Contracts.getContractPdfSignedUrl);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.createContract, ValidateSource.BODY),
	checkIdempotency,
	Contracts.generateContract,
);

router.post(
	'/workflow/prepare',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.generatePrepareContract, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['buildings'], null, RESOURCE_VS['BODY']),
	checkIdempotency,
	Contracts.prepareGenerateContract,
);

router.patch(
	'/:contractId/workflow/set-move-out-date',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.setMoveOutDate, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['contracts'], POLICY['MANAGER_EDIT_CONTRACT']),
	checkIdempotency,
	Contracts.setExpectedMoveOutDate,
);

router.patch(
	'/:contractId/workflow/cancel-terminate-early',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.cancelTerminateEarly, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['contracts'], POLICY['MANAGER_EDIT_CONTRACT']),
	checkIdempotency,
	Contracts.cancelIsEarlyTermination,
);

router.patch(
	'/:contractId/workflow/terminate-early',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.terminateEarly, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['contracts'], POLICY['MANAGER_EDIT_CONTRACT']),
	checkIdempotency,
	Contracts.terminateContractUnRefund,
);

router.patch(
	'/:contractId/workflow/contract-extention',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.contractExtention, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['contracts'], POLICY['MANAGER_EDIT_CONTRACT']),
	Contracts.contractExtention,
);

module.exports = router;
