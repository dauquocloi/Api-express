const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Buildings = require('./buildings');
const ROLES = require('../../constants/userRoles');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const { checkIdempotency } = require('../../middleware/idempotency');
const router = express.Router();
const { RESOURCES } = require('../../constants/resources');

router.get('/:buildingId/contract-term-url', validator(schema.id, ValidateSource.PARAM), Buildings.getContractTermUrl);

//=================//
router.use(authentication);
//=================//

router.get('/', authorization(ROLES['ADMIN'], ROLES['OWNER'], ROLES['MANAGER'], ROLES['STAFF']), Buildings.getAll);

router.get(
	'/:buildingId/bill-collection-progress',
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['buildings']),
	Buildings.getBillCollectionProgress,
);
router.get(
	'/:buildingId/rooms',
	authorization(ROLES['OWNER'], ROLES['MANAGER'], ROLES['STAFF']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['buildings']),
	Buildings.getRooms,
);

router.get(
	'/:buildingId/list-selecting-rooms',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['buildings']),

	Buildings.getListSectingRooms,
);

router.get(
	'/:buildingId/checkout-costs',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.period, ValidateSource.QUERY),

	checkResourceAccess(RESOURCES['buildings']),
	Buildings.getAllCheckoutCosts,
);

router.get(
	'/:buildingId/statistics',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),

	checkResourceAccess(RESOURCES['buildings']),
	Buildings.getStatistics,
);

router.get(
	'/:buildingId/statistic-general',
	authorization(ROLES['OWNER'], ROLES['MANAGER'], ROLES['STAFF']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.getStatisticGeneral, ValidateSource.QUERY),
	checkResourceAccess(RESOURCES['buildings']),
	Buildings.getStatisticGeneral,
);

router.get('/permissions', authorization(ROLES['OWNER']), Buildings.getBuildingPermissions);

router.patch(
	'/:buildingId/permissions',
	authorization(ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.editPermission, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['buildings']),
	Buildings.setBuildingPermission,
);

router.get(
	'/:buildingId/deposit-term-file',
	authorization(ROLES['OWNER'], ROLES['MANAGER'], ROLES['STAFF']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['buildings']),
	Buildings.getDepositTermFile,
);

router.get(
	'/:buildingId/workflow/finance-settlement-prepare',
	authorization(ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['buildings']),
	Buildings.getPrepareFinanceSettlementData,
);

router.post(
	'/:buildingId/workflow/finance-settlement',
	authorization(ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['buildings']),
	checkIdempotency,
	Buildings.financeSettlement,
);

// VERY IMPORTANT API !!!

module.exports = router;
