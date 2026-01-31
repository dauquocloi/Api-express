const UseCase = require('../../data_providers/tasks');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

exports.createTask = asyncHandler(async (req, res) => {
	let data = req.body;
	console.log('log of data from createTask: ', data);
	const result = await UseCase.createTask(data.performers, req.user._id, data.taskContent, data.detail, new Date(data.executionDate));
	return new SuccessResponse('Success', result).send(res);
});

exports.getTasks = asyncHandler(async (req, res) => {
	console.log('log of data from getTasks: ', req.query);
	const result = await UseCase.getTasks(
		req.user._id,
		Number(req?.query?.page) || 1,
		req.query?.data?.search ?? null,
		req.query?.data?.startDate ?? null,
		req.query?.data?.endDate ?? null,
	);
	return new SuccessResponse('Success', result).send(res);
});

exports.getTaskDetail = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from getTaskDetail: ', data);
	const result = await UseCase.getTaskDetail(data.taskId);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyTask = asyncHandler(async (req, res) => {
	console.log('req: ', req.files);
	const taskImages = req.files;
	let data = { ...req.body, ...req.user, ...req.params, taskImages };
	console.log('log of data from modifyTask: ', data);
	await UseCase.modifyTask(data);
	// return new SuccessMsgResponse('Success').send(res);
	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteTask = asyncHandler(async (req, res, next) => {
	let data = req.params;
	console.log('log of data from deleteTask: ', data);
	await UseCase.deleteTask(data.taskId);
	return new SuccessMsgResponse('Success').send(res);
});
