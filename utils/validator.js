const Joi = require('joi');
const validator = (schema) => (payload) => schema.validate(payload, { aborEarly: false });

const addFeeSchema = Joi.object({
	roomId: Joi.string().required(),
	feeName: Joi.string().required(),
	feeAmount: Joi.number().positive().required(),
	unit: Joi.string().required(),
	key: Joi.string().required,
	description: Joi.string().max(255),
});

const editFeeSchema = Joi.object({
	roomId: Joi.string(),
	feeId: Joi.string(),
	feeName: Joi.string(),
	feeAmount: Joi.number().positive(),
	unit: Joi.string(),
	description: Joi.string().max(255),
});

const modifyCustomerSchema = Joi.object({
	customerId: Joi.string(),
	status: Joi.number(),
	fullName: Joi.string(),
	gender: Joi.string(),
	isContractOwner: Joi.boolean(),
	birthday: Joi.date(),
	permanentAddress: Joi.string(),
	phone: Joi.string(),
	cccd: Joi.string(),
	cccdIssueDate: Joi.date(),
	status: Joi.number(),
	room: Joi.string(),
	temporaryResidence: Joi.boolean(),
	checkinDate: Joi.date(),
	checkoutDate: Joi.date(),
	// note: Joi.string(),
});

const editVehicleSchema = Joi.object({
	vehicleId: Joi.string(),
	licensePlate: Joi.string(),
	fromDate: Joi.date(),
	owner: Joi.string(),
	image: Joi.string().allow(''),
	status: Joi.number(),
});

const addVehicleSchema = Joi.object({
	// fieldname: Joi.string(),
	customerId: Joi.string(),
	licensePlate: Joi.string(),
	fromDate: Joi.date(),
	image: Joi.string(),
	status: Joi.number(),
	room: Joi.string(),
});

const modifyUserSchema = Joi.object({
	userId: Joi.string(),
	status: Joi.number(),
	fullname: Joi.string(),
	phone: Joi.string(),
	cccd: Joi.string(),
	cccdIssueDate: Joi.date(),
	permanentAddress: Joi.string(),
	avatar: Joi.string(),
	birthday: Joi.date(),
});

const getVehicleSchema = Joi.object({
	vehicleId: Joi.string(),
});

const importRoomImageSchema = Joi.object({
	roomId: Joi.string(),
	roomImage: Joi.string(),
});

const modifyInteriorSchema = Joi.object({
	roomId: Joi.string(),
	interiorName: Joi.string(),
	interiorRentalDate: Joi.date(),
	interiorQuantity: Joi.number(),
});

const createDepositSchema = Joi.object({
	roomId: Joi.string(),
	buildingId: Joi.string(),
	receiptId: Joi.string(),
	rent: Joi.number(),
	depositAmount: Joi.number(),
	actualDepositAmount: Joi.number(),
	depositCompletionDate: Joi.date(),
	checkinDate: Joi.date(),
	rentalTerm: Joi.string(),
	numberOfOccupants: Joi.number(),
});

exports.addFeeSchema = validator(addFeeSchema);

exports.editFeeSchema = validator(editFeeSchema);

exports.modifyCustomerSchema = validator(modifyCustomerSchema);

exports.editVehicleSchema = validator(editVehicleSchema);

exports.addVehicleSchema = validator(addVehicleSchema);

exports.getVehicleSchema = validator(getVehicleSchema);

exports.importRoomImageSchema = validator(importRoomImageSchema);

exports.modifyInteriorSchema = validator(modifyInteriorSchema);

exports.modifyUserSchema = validator(modifyUserSchema);

exports.createDepositSchema = validator(createDepositSchema);
