const express = require('express');
const authorization = require('../../auth/authorization');
const authentication = require('../../auth/authentication');
const Roles = require('../../constants/userRoles');
const router = express.Router();
const Companies = require('./companies');
const schema = require('./schema');
const { ValidateSource, validator } = require('../../utils/validator');
const { checkIdempotency } = require('../../middleware/idempotency');

router.use(authentication);

router.get('/permissions', authorization(Roles['OWNER']), Companies.getCompanyPermissions);

router.patch(
	'/permissions',
	authorization(Roles['OWNER']),
	validator(schema.setCompanyPermission, ValidateSource.BODY),
	checkIdempotency,
	Companies.setCompanyPermission,
);

module.exports = router;
