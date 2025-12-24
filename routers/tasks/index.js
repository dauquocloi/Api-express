const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Tasks = require('./tasks');
const authentication = require('../../auth/authentication');

const router = express.Router();

router.use(authentication);
router.get('/', validator(schema.getTasks, ValidateSource.QUERY), Tasks.getTasks);
router.post('/', validator(schema.createTask, ValidateSource.BODY), Tasks.createTask);
router.get('/:taskId', validator(schema.id, ValidateSource.PARAM), Tasks.getTaskDetail);
router.patch('/:taskId', validator(schema.id, ValidateSource.PARAM), validator(schema.modifyTask, ValidateSource.BODY), Tasks.modifyTask);
router.delete('/:taskId', validator(schema.id, ValidateSource.PARAM), Tasks.deleteTask);

module.exports = router;
