const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Tasks = require('./tasks');
const authentication = require('../../auth/authentication');
const { parseFormDataFields } = require('../../utils/parseMultipartBody');
const upload = require('../../middleware/multer');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');

const router = express.Router();

router.use(authentication);

router.get('/', validator(schema.getTasks, ValidateSource.QUERY), Tasks.getTasks);

router.post('/', validator(schema.createTask, ValidateSource.BODY), Tasks.createTask);

router.get('/:taskId', validator(schema.id, ValidateSource.PARAM), Tasks.getTaskDetail);

router.patch(
	'/:taskId',
	upload.array('image', 4),
	validator(schema.id, ValidateSource.PARAM),
	parseFormDataFields,
	validator(schema.modifyTask, ValidateSource.BODY),
	Tasks.modifyTask,
);

router.delete('/:taskId', authorization(ROLES['MANAGER'], ROLES['OWNER']), validator(schema.id, ValidateSource.PARAM), Tasks.deleteTask);

module.exports = router;
