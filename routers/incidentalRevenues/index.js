const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const IncidentalRevenues = require('./incidentalRevenues');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');

const router = express.Router();
router.use(authentication);
router.post('/', validator(schema.createIncidentalRevenue, ValidateSource.BODY), IncidentalRevenues.createIncidentalRevenue);
router.patch(
	'/:incidentalRevenueId',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyIncidentalRevenue, ValidateSource.BODY),
	IncidentalRevenues.modifyIncidentalRevenue,
);
router.delete('/:incidentalRevenueId', validator(schema.id, ValidateSource.PARAM), IncidentalRevenues.deleteIncidentalRevenue);

module.exports = router;
