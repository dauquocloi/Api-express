const Joi = require('joi');
// // const validator = (schema) => (payload) => schema.validate(payload, { abortEarly: false });
const { Types } = require('mongoose');
const { InvalidInputError } = require('../AppError');
// const { InvalidInputError } = require('../AppError');

// // ----------Deposit and Contract schema--------------------//
// const customerContractSchema = Joi.object({
// 	fullName: Joi.string().required(),
// 	phone: Joi.string().required(),
// 	cccd: Joi.string().required(),
// 	cccdIssueDate: Joi.date().iso().optional(),
// 	cccdIssueAt: Joi.string().optional(),
// 	address: Joi.string().allow(''),
// 	dob: Joi.date().iso().optional(),
// 	gender: Joi.string().valid('nam', 'nữ', 'khác').required(), // chỉ cho phép các giá trị cụ thể
// });

// const interiorContractSchema = Joi.object({
// 	interiorName: Joi.string(),
// 	quantity: Joi.number(),
// 	interiorRentalDate: Joi.date().optional(),
// });

// const vehicleContractSchema = Joi.object({
// 	licensePlate: Joi.string().required(),
// 	ownerPhone: Joi.string().required(),
// });

// const feeContractSchema = Joi.object({
// 	feeKey: Joi.string().required(),
// 	feeAmount: Joi.number().required(),
// 	firstIndex: Joi.number().optional(),
// 	lastIndex: Joi.number().optional(),
// 	quantity: Joi.number().optional(),
// });

// const feeInvoiceSchema = Joi.object({
// 	_id: Joi.string().optional(),
// 	feeName: Joi.string(),
// 	feeKey: Joi.string().required(),
// 	feeAmount: Joi.number().required(),
// 	firstIndex: Joi.number().optional(),
// 	secondIndex: Joi.number().optional(),
// 	quantity: Joi.number().optional(),
// 	unit: Joi.string(),
// }).custom((value, helpers) => {
// 	if (value.firstIndex !== undefined && value.secondIndex !== undefined && value.secondIndex < value.firstIndex) {
// 		return helpers.message(`"Chỉ số cuối" phải lớn hơn hoặc bằng "chỉ số đầu"`);
// 	}
// 	return value;
// }, 'Kiểm tra logic giữa firstIndex và secondIndex');

// // -----------------------------//
// const addFeeSchema = Joi.object({
// 	roomId: Joi.string().required(),
// 	feeName: Joi.string().required(),
// 	feeAmount: Joi.number().positive().required(),
// 	unit: Joi.string().required(),
// 	key: Joi.string().required,
// 	description: Joi.string().max(255),
// });

// const editFeeSchema = Joi.object({
// 	roomId: Joi.string().optional(),
// 	feeId: Joi.string(),
// 	feeName: Joi.string().optional(),
// 	feeAmount: Joi.number().positive(),
// 	unit: Joi.string().optional(),
// 	description: Joi.string().max(255).optional(),
// 	lastIndex: Joi.number().optional(),
// });

// const modifyCustomerSchema = Joi.object({
// 	customerId: Joi.string().optional(),
// 	fullName: Joi.string(),
// 	gender: Joi.string(),
// 	isContractOwner: Joi.boolean().optional(),
// 	birthday: Joi.date(),
// 	permanentAddress: Joi.string(),
// 	phone: Joi.string(),
// 	cccd: Joi.string(),
// 	cccdIssueDate: Joi.date(),
// 	cccdIssueAt: Joi.string(),
// 	status: Joi.number().optional(),
// 	room: Joi.string().optional(),
// 	temporaryResidence: Joi.boolean(),
// 	checkinDate: Joi.date().optional(),
// 	checkoutDate: Joi.date().optional(),
// 	// note: Joi.string(),
// });

// const editVehicleSchema = Joi.object({
// 	vehicleId: Joi.string(),
// 	licensePlate: Joi.string(),
// 	fromDate: Joi.date(),
// 	owner: Joi.string(),
// 	image: Joi.string().allow(''),
// 	status: Joi.number(),
// });

// const addVehicleSchema = Joi.object({
// 	customerId: Joi.string(),
// 	licensePlate: Joi.string(),
// 	fromDate: Joi.date(),
// 	image: Joi.string().allow('').optional(),
// 	status: Joi.string(),
// 	roomId: Joi.string(),
// });

// const modifyUserSchema = Joi.object({
// 	userId: Joi.string(),
// 	status: Joi.number(),
// 	fullname: Joi.string(),
// 	phone: Joi.string(),
// 	cccd: Joi.string(),
// 	cccdIssueDate: Joi.date(),
// 	permanentAddress: Joi.string(),
// 	avatar: Joi.string(),
// 	birthday: Joi.date(),
// });

// const getVehicleSchema = Joi.object({
// 	vehicleId: Joi.string(),
// });

// const importRoomImageSchema = Joi.object({
// 	roomId: Joi.string(),
// 	roomImage: Joi.string(),
// });

// const modifyInteriorSchema = Joi.object({
// 	roomId: Joi.string(),
// 	interiorName: Joi.string(),
// 	interiorRentalDate: Joi.date(),
// 	interiorQuantity: Joi.number(),
// });

// const createDepositSchema = Joi.object({
// 	roomId: Joi.string(),
// 	buildingId: Joi.string(),
// 	receiptId: Joi.string(),
// 	rent: Joi.number(),
// 	depositAmount: Joi.number(),
// 	depositCompletionDate: Joi.date(),
// 	checkinDate: Joi.date(),
// 	rentalTerm: Joi.string().empty(),
// 	numberOfOccupants: Joi.number(),
// 	customer: customerContractSchema,
// 	interiors: Joi.array().items(interiorContractSchema),
// 	fees: Joi.array().items(feeContractSchema),
// });

// const generateContractSchema = Joi.object({
// 	roomId: Joi.string().required(),
// 	buildingId: Joi.string().required(),
// 	depositId: Joi.string().allow(null).optional(),
// 	receipt: Joi.string().required(),
// 	rent: Joi.number().required(),
// 	depositAmount: Joi.number().required(),
// 	contractSignDate: Joi.date().required(),
// 	contractEndDate: Joi.date().required(),
// 	contractTerm: Joi.string().required(),
// 	customers: Joi.array().items(customerContractSchema).min(1).required(),
// 	interiors: Joi.array().items(interiorContractSchema),
// 	vehicles: Joi.array().items(vehicleContractSchema).optional(),
// 	fees: Joi.array().items(feeContractSchema),
// });

// const generateInvoiceSchema = Joi.object({
// 	roomId: Joi.string().hex().length(24),
// 	buildingId: Joi.string().required(),
// 	fees: Joi.array().items(feeInvoiceSchema),
// 	debts: Joi.array()
// 		.items(
// 			Joi.object({
// 				_id: Joi.string().hex().length(24),
// 				debtId: Joi.string().optional(),
// 				content: Joi.string(),
// 				amount: Joi.number(),
// 			}),
// 		)
// 		.optional(),
// 	stayDays: Joi.number().min(0).max(31).note('Ngày ko được vượt quá 31 ngày'),
// 	roomIndex: Joi.string(),
// 	buildingName: Joi.string(),
// 	// oaId: Joi.string(),
// });
// const settingNotificationSchema = Joi.object({
// 	type: Joi.string()
// 		.valid(
// 			'paymentReceived',
// 			'staffTaskCompleted',
// 			'roomCheckout',
// 			'roomCheckoutEarly',
// 			'cashCollected',
// 			'assignedTask',
// 			'contractExpiring',
// 			'roomDeposited',
// 		)
// 		.required(),
// 	enabled: Joi.boolean().required(),
// });

// exports.addFeeSchema = validator(addFeeSchema);

// // exports.editFeeSchema = validator(editFeeSchema);

// exports.editVehicleSchema = validator(editVehicleSchema);

// exports.addVehicleSchema = validator(addVehicleSchema);

// // exports.importRoomImageSchema = validator(importRoomImageSchema);

// exports.modifyInteriorSchema = validator(modifyInteriorSchema);

// exports.modifyUserSchema = validator(modifyUserSchema);

// module.exports = {
// 	validateGenerateContract: validator(generateContractSchema),
// 	validateGetVehicle: validator(getVehicleSchema),
// 	validateCreateDeposit: validator(createDepositSchema),
// 	validateCreateCustomer: validator(modifyCustomerSchema),
// 	validateCreateVehicle: validator(addVehicleSchema),
// 	validateModifyInterior: validator(modifyInteriorSchema),
// 	validateImportRoomImageSchema: validator(importRoomImageSchema),
// 	validateGenerateInvoice: validator(generateInvoiceSchema),
// 	validateEditFee: validator(editFeeSchema),
// 	JoiObjectId,
// };
const ValidateSource = {
	BODY: 'body',
	HEADER: 'headers',
	QUERY: 'query',
	PARAM: 'params',
};

const validator = (schema, source) => (req, res, next) => {
	console.log('log of req from validator: ', req[source]);
	try {
		const { error } = schema.validate(req[source]);

		if (!error) return next();

		const { details } = error;
		const message = details.map((i) => i.message.replace(/['"]+/g, '')).join(',');

		next(new InvalidInputError(message));
	} catch (error) {
		next(error);
	}
};

const JoiAuthBearer = () =>
	Joi.string().custom((value, helpers) => {
		if (!value.startsWith('Bearer ')) return helpers.error('any.invalid');
		if (!value.split(' ')[1]) return helpers.error('any.invalid');
		return value;
	}, 'Authorization Header Validation');

const JoiObjectId = () =>
	Joi.string().custom((value, helpers) => {
		if (!Types.ObjectId.isValid(value)) return helpers.error('any.invalid');
		return value;
	}, 'Object Id Validation');

// module.exports = (schema, source) => (req, res, next) => {
// 	try {
// 		const { error } = schema.validate(req[source]);

// 		if (!error) return next();

// 		const { details } = error;
// 		const message = details.map((i) => i.message.replace(/['"]+/g, '')).join(',');

// 		next(new InvalidInputError(message));
// 	} catch (error) {
// 		next(error);
// 	}
// };

module.exports = {
	JoiAuthBearer,
	validator,
	ValidateSource,
	JoiObjectId,
};
