const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Revenues = require('./revenues');
const authentication = require('../../auth/authentication');

const router = express.Router();
// router.use(authentication);
router.get('/', validator(schema.getAllRevenues, ValidateSource.QUERY), Revenues.getRevenues);
router.post('/incidental', validator(schema.createIncidentalRevenue, ValidateSource.BODY), Revenues.createIncidentalRevenue);
router.patch(
	'/:revenueId/incidental',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyIncidentalRevenue, ValidateSource.BODY),
	Revenues.modifyIncidentalRevenue,
);
router.delete('/:revenueId/incidental', validator(schema.id, ValidateSource.PARAM), Revenues.deleteIncidentalRevenue);
router.get('/fees', validator(schema.getFees, ValidateSource.QUERY), Revenues.getTotalFeeRevenue);

module.exports = router;
