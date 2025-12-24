const UseCase = require('../../data_providers/rooms');
const { validateImportRoomImageSchema, validateModifyInterior } = require('../../utils/validator');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');

// const JWT_SECRET = '82371923sdasdads[]sdsadasd'; // this is shit

exports.getRoom = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from getRoom: ', data);

	const roomInfo = await UseCase.getRoom(data.roomId);
	return new SuccessResponse('Success', roomInfo).send(res);
});

exports.addInterior = asyncHandler(async (req, res) => {
	const roomId = req.params.roomId;
	const interior = req.body;
	const result = await UseCase.addInterior(roomId, interior);
	return new SuccessResponse('Success', result).send(res);
});

exports.editInterior = asyncHandler(async (req, res) => {
	const interiorId = req.params.interiorId;
	const roomId = req.params.roomId;
	const interior = req.body;
	await UseCase.editInterior(interiorId, roomId, interior);
	return new SuccessMsgResponse('Success').send(res);
});

exports.removeInterior = asyncHandler(async (req, res) => {
	const interiorId = req.params.interiorId;
	await UseCase.removeInterior(interiorId);
	return new SuccessMsgResponse('Success').send(res);
});

exports.generateDepositReceiptAndFirstInvoice = asyncHandler(async (req, res) => {
	const roomId = req.params.roomId;
	const buildingId = req.body.buildingId;
	const createrId = req.user._id;
	const result = await UseCase.generateDepositReceiptAndFirstInvoice(
		roomId,
		buildingId,
		createrId,
		req.body.depositAmount,
		req.body.payer,
		req.body.stayDays,
		req.body.feeIndexValues,
	);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyRent = asyncHandler(async (req, res) => {
	const data = { ...req.body, ...req.params };
	console.log('log of data from modifyRent: ', data);
	await UseCase.modifyRent(data.roomId, data.newRent);
	return new SuccessMsgResponse('Success').send(res);
});

exports.generateCheckoutCost = asyncHandler(async (req, res) => {
	console.log('log of req from generateCheckoutCost: ', req.body);
	const result = await UseCase.generateCheckoutCost(
		req.params.roomId,
		req.body.buildingId,
		req.body.contractId,
		req.user._id,
		req.body.feeIndexValues,
		req.body.feesOther,
		req.body.stayDays,
		req.body.roomVersion,
	);
	return new SuccessResponse('Success', result).send(res);
});

exports.deleteDebts = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of data from deleteDebts: ', data);
	await UseCase.deleteDebts(data.roomId);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getDebtsAndReceiptUnpaid = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of data from getDebtsAndReceiptUnpaid: ', data);
	const result = await UseCase.getDebtsAndReceiptUnpaid(data.roomId, data.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.getRoomFeesAndDebts = asyncHandler(async (req, res) => {
	console.log('log of data from getRoomFeesAndDebts: ', req.params);
	const result = await UseCase.getRoomFeesAndDebts(req.params.roomId, req.user._id);
	return new SuccessResponse('Success', result).send(res);
});

//============================ UN REFACTED =====================================//

exports.create = (req, res) => {
	var data = req.body;
	console.log(data);

	UseCase.create(data, (err, result) => {
		if (err) {
			return res.status(204).send({
				errorCode: 0,
				data: {},
				message: 'created fail',
				errors: [],
			});
		} else {
			return res.status(201).send({
				errorCode: 0,
				data: result,
				message: 'succesfull created',
				errors: [],
			});
		}
	});
};

//not used
exports.update = (req, res) => {
	var data = req.body;
	console.log('This is log of room update req.body', req.body);
	UseCase.update(data, (err, result) => {
		if (err) {
			return res.status(204).send({
				errorCode: 0,
				data: {},
				message: 'err',
				errors: [],
			});
		} else {
			return res.status(200).send({
				errorCode: 0,
				data: result,
				message: 'succesfull',
				errors: [],
			});
		}
	});
};

//not used
exports.finance = (req, res) => {
	var data = req.query;
	console.log('this is log of finance param', data);
	UseCase.finance(data, (err, result) => {
		if (err) {
			return res.status(204).send({
				errorCode: 0,
				data: {},
				message: 'err',
				errors: [],
			});
		} else {
			return res.status(200).send({
				errorCode: 0,
				data: result,
				message: 'succesfull',
				errors: [],
			});
		}
	});
};

exports.importImage = (req, res) => {
	try {
		// const { error, value } = validateImportRoomImageSchema(req.params);

		// if (error) {
		// 	return res.status(400).send({
		// 		errorCode: 1,
		// 		data: {},
		// 		message: 'Invalid input data',
		// 		errors: error.details.map((err) => err.message),
		// 	});
		// }
		const imagesRoom = req.files;

		const data = { ...req.params, imagesRoom };
		console.log('log of data from importImage');
		UseCase.importImage(
			data,
			(err, result) => {
				if (result) {
					return res.status(201).send({
						errorCode: 0,
						data: result,
						message: 'succesfull',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(new Error(error.message));
	}
};

exports.updateNoteRoom = (req, res) => {
	try {
		const data = { ...req.body, ...req.params };
		console.log('log of data from updateNoteRoom: ', data);
		UseCase.updateNoteRoom(
			data,
			(err, result) => {
				if (result) {
					return res.status(201).send({
						errorCode: 0,
						message: 'successful',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};
