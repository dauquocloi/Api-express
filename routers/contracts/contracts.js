const UseCase = require('../../data_providers/contracts');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { client: redis } = require('../../config').redisDb;
const { executeIdempotent } = require('../../utils/idempotent');
const generateRequestHash = require('../../utils/generateRequestHash');

exports.prepareGenerateContract = asyncHandler(async (req, res) => {
	const { roomId, buildingId, finance, fees, interiors, customers, contractPeriod, note, stayDays } = req.body;

	const data = {
		roomId,
		buildingId,
		finance,
		fees,
		interiors,
		customers,
		contractPeriod,
		note: note.trim() ?? '',
		stayDays: Number(stayDays),
	};

	console.log('log of data from prepareGenerateContract: ', data);
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			roomId: roomId,
			buildingId: buildingId,
			finance: finance,
			fees: fees,
			interiors: interiors,
			customers: customers,
			contractPeriod: contractPeriod,
			note: note,
			stayDays: stayDays,
		}),
		resourceId: data.roomId,
		execute: () => UseCase.prepareGenerateContract(data),
	});

	return new SuccessResponse('Success', result).send(res);
});

exports.generateContract = asyncHandler(async (req, res) => {
	console.log('log of data from create: ', req.params);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			contractDraftId: data.contractDraftId,
		}),
		resourceId: data.contractDraftId,
		execute: () => UseCase.generateContract(req.params.contractDraftId, req.user._id),
	});
	return new SuccessMsgResponse('Success').send(res);
});

exports.getContractPdfSignedUrl = asyncHandler(async (req, res) => {
	let data = req.query;
	console.log('log of data from getContractPdfSignedUrl: ', data);
	const result = await UseCase.getContractPdfSignedUrl(data.contractCode);
	return new SuccessResponse('Success', result).send(res);
});

exports.setExpectedMoveOutDate = asyncHandler(async (req, res) => {
	const { contractId } = req.params;
	const { expectedMoveOutDate } = req.body;
	const data = { contractId, expectedMoveOutDate, userId: req.user._id };
	console.log('log of data from setExpectedMoveOutDate: ', data);

	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			contractId: contractId,
			expectedMoveOutDate: expectedMoveOutDate,
		}),
		resourceId: contractId,
		execute: () => UseCase.setExpectedMoveOutDate(data),
	});
	return SuccessMsgResponse('Success').send(res);
});

exports.cancelIsEarlyTermination = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of data from cancelIsEarlyTermination: ', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			contractId: data.contractId,
		}),
		resourceId: data.contractId,
		execute: () => UseCase.cancelIsEarlyTermination(data.contractId, data.roomId),
	});
	return SuccessMsgResponse('Success').send(res);
});

// exports.terminateContractUnRefund = asyncHandler(async (req, res) => {
// 	const data = req.params;
// 	console.log('log of data from terminateContractUnRefund: ', data);
// 	await UseCase.terminateContractUnRefund(data.contractId, req.redisKey);
// 	return SuccessMsgResponse('Success').send(res);
// });

exports.getContractPdfUrlByCustomerPhone = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of data from getContractPdfUrlByCustomerPhone: ', data);
	const result = await UseCase.getContractPdfUrlByCustomerPhone(data.phone);
	console.log('log of result from getContractPdfUrlByCustomerPhone: ', result);
	return new SuccessResponse('Success', result).send(res);
});

exports.contractExtention = asyncHandler(async (req, res) => {
	const { contractId } = req.params;
	const { extensionDate, contractSignDate, newRent, newDepositAmount, contractTerm, version } = req.body;
	const data = {
		contractId,
		extensionDate,
		contractSignDate,
		newRent: Number(newRent),
		newDepositAmount: Number(newDepositAmount),
		userId: req.user._id,
		contractTerm,
		version,
	};
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			contractId: contractId,
			extensionDate: extensionDate,
			contractSignDate: contractSignDate,
			newRent: newRent,
			newDepositAmount: newDepositAmount,
			contractTerm: contractTerm,
			version: version,
		}),
		resourceId: contractId,
		execute: () => UseCase.contractExtention(data),
	});
	return new SuccessMsgResponse('Success').send(res);
});

exports.getDebtsAndReceiptsUnpaid = asyncHandler(async (req, res) => {
	console.log('log of data from getDebtsAndReceiptsUnpaid: ', req.params);
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			contractId: req.params.contractId,
			usedFor: req.body.usedFor,
		}),
		resourceId: req.params.contractId,
		execute: () => UseCase.getDebtsAndReceiptsUnpaid(req.params.contractId, req.user._id, req.query.usedFor),
	});
	return new SuccessResponse('Success', result).send(res);
});
