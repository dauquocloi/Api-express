const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Buildings = require('./buildings');
const ROLES = require('../../constants/userRoles');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const router = express.Router();

router.use(authentication);

router.get('/', Buildings.getAll);

router.get(
	'/:buildingId/bill-collection-progress',
	// checkResourceAccess(RESOURCE),
	validator(schema.id, ValidateSource.PARAM),
	Buildings.getBillCollectionProgress,
);
router.get('/:buildingId/rooms', validator(schema.id, ValidateSource.PARAM), Buildings.getRooms);

router.get('/:buildingId/list-selecting-rooms', validator(schema.id, ValidateSource.PARAM), Buildings.getListSectingRooms);

router.get(
	'/:buildingId/checkout-costs',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.period, ValidateSource.QUERY),
	Buildings.getAllCheckoutCosts,
);

router.get('/:buildingId/statistics', validator(schema.id, ValidateSource.PARAM), Buildings.getStatistics);

router.get(
	'/:buildingId/statistic-general',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.getStatisticGeneral, ValidateSource.QUERY),
	Buildings.getStatisticGeneral,
);

router.get('/permissions', authorization(ROLES['OWNER']), Buildings.getBuildingPermissions);

router.patch(
	'/:buildingId/permissions',
	authorization(ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.editPermission, ValidateSource.BODY),

	Buildings.setBuildingPermission,
);

router.get('/:buildingId/deposit-term-file', validator(schema.id, ValidateSource.PARAM), Buildings.getDepositTermFile);

module.exports = router;
