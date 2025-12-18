const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Buildings = require('./buildings');
const authentication = require('../../auth/authentication');

const router = express.Router();

router.use(authentication);
router.get('/', Buildings.getAll);
router.get('/:buildingId/bill-collection-progress', validator(schema.id, ValidateSource.PARAM), Buildings.getBillCollectionProgress);
router.get('/:buildingId/rooms', validator(schema.id, ValidateSource.PARAM), Buildings.getRooms);
router.get('/:buildingId/list-selecting-rooms', validator(schema.id, ValidateSource.PARAM), Buildings.getListSectingRooms);
router.get(
	'/:buildingId/checkout-costs',
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
router.get('/permissions', Buildings.getBuildingPermissions);
router.patch(
	'/:buildingId/permissions',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.editPermission, ValidateSource.BODY),

	Buildings.setBuildingPermission,
);

module.exports = router;
