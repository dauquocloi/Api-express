const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const BankAccounts = require('./bankAccounts');
const { ValidateSource } = require('../../utils/validator');
const { checkIdempotency } = require('../../middleware/idempotency');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');

const router = express.Router();

//==================//
router.use(authentication);
//==================//

router.post(
	'/',
	authorization(ROLES['OWNER']),
	validator(schema.createBankAccount, ValidateSource.BODY),
	checkIdempotency,
	BankAccounts.createBankAccount,
);

module.exports = router;
