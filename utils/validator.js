const Joi = require('joi');
const validator = (schema) => (payload) => schema.validate(payload, { abortEarly: false });

// ----------Deposit and Contract schema--------------------//
const customerContractSchema = Joi.object({
	fullName: Joi.string().required(),
	phone: Joi.string().required(),
	cccd: Joi.string().required(),
	cccdIssueDate: Joi.date().iso().required(), // Định dạng ISO như '2021-03-17'
	cccdIssueAt: Joi.string().required(),
	address: Joi.string().required(),
	dob: Joi.date().iso().required(), // Ngày sinh
	gender: Joi.string().valid('nam', 'nữ', 'khác').required(), // chỉ cho phép các giá trị cụ thể
});

const interiorContractSchema = Joi.object({
	interiorName: Joi.string(),
	quantity: Joi.number(),
	interiorRentalDate: Joi.date().optional(),
});

const vehicleContractSchema = Joi.object({
	licensePlate: Joi.string().required(),
	ownerPhone: Joi.string().required(),
});

const feeContractSchema = Joi.object({
	feeKey: Joi.string().required(),
	feeAmount: Joi.number().required(),
	lastIndex: Joi.number().optional(),
});

// -----------------------------//
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
	customerId: Joi.string(),
	licensePlate: Joi.string(),
	fromDate: Joi.date(),
	image: Joi.string().allow('').optional(),
	status: Joi.string(),
	roomId: Joi.string(),
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
	depositCompletionDate: Joi.date(),
	checkinDate: Joi.date(),
	rentalTerm: Joi.string().empty(),
	numberOfOccupants: Joi.number(),
	customer: customerContractSchema,
	interiors: Joi.array().items(interiorContractSchema),
	fees: Joi.array().items(feeContractSchema),
});

const generateContractSchema = Joi.object({
	roomId: Joi.string().required(),
	buildingId: Joi.string().required(),
	receipt: Joi.string().required(),
	depositId: Joi.string().optional(),
	rent: Joi.number().required(),
	depositAmount: Joi.number().required(),
	contractSignDate: Joi.date().required(),
	contractEndDate: Joi.date().required(),
	contractTerm: Joi.string().required(),
	customers: Joi.array().items(customerContractSchema).min(1).required(),
	interiors: Joi.array().items(interiorContractSchema),
	vehicles: Joi.array().items(vehicleContractSchema).optional(),
	fees: Joi.array().items(feeContractSchema),
});

exports.addFeeSchema = validator(addFeeSchema);

exports.editFeeSchema = validator(editFeeSchema);

exports.editVehicleSchema = validator(editVehicleSchema);

exports.addVehicleSchema = validator(addVehicleSchema);

// exports.importRoomImageSchema = validator(importRoomImageSchema);

exports.modifyInteriorSchema = validator(modifyInteriorSchema);

exports.modifyUserSchema = validator(modifyUserSchema);

module.exports = {
	validateGenerateContract: validator(generateContractSchema),
	validateGetVehicle: validator(getVehicleSchema),
	validateCreateDeposit: validator(createDepositSchema),
	validateCreateCustomer: validator(modifyCustomerSchema),
	validateCreateVehicle: validator(addVehicleSchema),
	validateModifyInterior: validator(modifyInteriorSchema),
	validateImportRoomImageSchema: validator(importRoomImageSchema),
};
