const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Customers = require('./customers');
const authentication = require('../../auth/authentication');

const router = express.Router();
router.use(authentication);
router.get('/', validator(schema.getAllCustomers, ValidateSource.QUERY), Customers.getAllCustomers);
router.get('/list-selections', validator(schema.getListSelections, ValidateSource.QUERY), Customers.getListSelectingCustomer);
router.post('/', validator(schema.createCustomer, ValidateSource.BODY), Customers.addCustomer);
router.patch(
	'/:customerId',
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyCustomer, ValidateSource.BODY),
	Customers.editCustomer,
);
router.patch('/:customerId/status', validator(schema.id, ValidateSource.PARAM), Customers.setCustomerStatus);

module.exports = router;
