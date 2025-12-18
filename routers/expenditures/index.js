const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Expenditures = require('./expenditures');
const authentication = require('../../auth/authentication');

const router = express.Router();

// router.use(authentication);
router.get('/', validator(schema.getAllExpenditures, ValidateSource.QUERY), Expenditures.getExpenditures);
router.post('/', validator(schema.createExpenditure, ValidateSource.BODY), Expenditures.createExpenditure);
router.patch(
	'/:expenditureId',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyExpenditure, ValidateSource.BODY),
	Expenditures.modifyExpenditure,
);
router.delete('/:expenditureId', validator(schema.id, ValidateSource.PARAM), Expenditures.deleteExpenditure);

module.exports = router;
