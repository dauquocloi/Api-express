const Services = require('../service');
const { CUSTOMER_STATUS, vehicleStatus, feeUnit, FEE_UNIT_TYPE, receiptStatus, CONTRACT_DOCUMENT_FIELDS } = require('../constants');
const { ConflictError } = require('../AppError');
const listFeeInitial = require('../utils/getListFeeInital');
const moment = require('moment');
const generateContractDocument = require('../utils/generateContract');
const path = require('path');
const fs = require('fs');
const { previewContractPdfExp } = require('../constants');
const capitalizeFirstLetter = require('../utils/capitalizeFirstLetter');

const formatDate = (date) => {
	if (date == null || date === '') {
		return {
			DAY: '',
			MONTH: '',
			YEAR: '',
		};
	}

	const value = moment(date).utcOffset('+07:00');

	if (!value.isValid()) {
		return {
			DAY: '',
			MONTH: '',
			YEAR: '',
		};
	}

	return {
		DAY: value.format('DD'),
		MONTH: value.format('MM'),
		YEAR: value.format('YYYY'),
	};
};

const formatCustomer = (customer = {}) => {
	const { FULLNAME, DOB, ADDRESS, CCCD, CCCD_DATE, CCCD_AT, PHONE } = CONTRACT_DOCUMENT_FIELDS.CUSTOMER_FIELDS;

	return {
		[FULLNAME]: customer.fullName ?? '',
		[DOB]: customer.dob ? moment(customer.dob).format('DD/MM/YYYY') : '',
		[ADDRESS]: customer.address ?? '',
		[CCCD]: customer.cccd ?? '',
		[CCCD_DATE]: customer.cccdIssueDate ? moment(customer.cccdIssueDate).format('DD/MM/YYYY') : '',
		[CCCD_AT]: customer.cccdIssueAt ?? '',
		[PHONE]: customer.phone ?? '',
	};
};

const formatFees = (fees = []) => {
	const { NAME, AMOUNT, TYPE } = CONTRACT_DOCUMENT_FIELDS.FEE_FIELDS;

	return fees.map((fee) => ({
		[NAME]: fee.feeName ?? '',
		[AMOUNT]: String(fee.feeAmount ?? ''),
		[TYPE]: FEE_UNIT_TYPE[fee.unit] || '',
	}));
};

const formatInteriors = (interiors = []) => {
	const { NAME, QUANT } = CONTRACT_DOCUMENT_FIELDS.INTERIOR_FIELDS;

	return interiors.map((item) => ({
		[NAME]: capitalizeFirstLetter(item.interiorName),
		[QUANT]: capitalizeFirstLetter(String(item.quantity)),
	}));
};

exports.formatContractDocument = ({
	roomIndex,
	customerInfo = {},
	fees = [],
	interiors = [],
	depositAmount,
	contractSignDate,
	contractEndDate,
	contractTerm,
	rent,
	roomMates = [],
	note,
}) => {
	const fields = CONTRACT_DOCUMENT_FIELDS;
	// const feeData = formatFees(fees);
	// const customerData = formatCustomer(customerInfo);
	// console.log('log of customerData - feeData: ', customerData);
	// console.log('log of feeData: ', feeData);
	return {
		[fields.ROOM_INDEX]: roomIndex ?? '',
		[fields.CREATED_DATE]: formatDate(new Date()),

		[fields.PARTY_A]: formatCustomer(customerInfo),

		[fields.FEES]: formatFees(fees),

		[fields.INTERIORS]: formatInteriors(interiors),

		[fields.DEPOSIT]: String(depositAmount ?? ''),

		[fields.SIGN_DATE]: formatDate(contractSignDate),

		[fields.END_DATE]: formatDate(contractEndDate),

		[fields.CONTRACT_TERM]: contractTerm ?? '',

		[fields.ROOM_PRICE]: String(rent ?? 0),

		[fields.ROOM_MATES]: roomMates.map(formatCustomer),

		[fields.NOTE]: note ?? '',
	};
};

exports.formatInitialFees = (fees) =>
	fees.map((fee) => {
		const matchFee = listFeeInitial.find((feeItem) => feeItem.feeKey === fee.feeKey);

		if (matchFee.unit === feeUnit['INDEX']) {
			return {
				...matchFee,
				feeAmount: fee.feeAmount,
				firstIndex: fee.firstIndex,
				secondIndex: fee.secondIndex,
			};
		} else {
			return {
				...matchFee,
				feeAmount: fee.feeAmount,
				quantity: fee.quantity,
			};
		}
	});

exports.processImportCustomersAndVehicles = async ({ customers, contractEndDate, contractId, roomId }) => {
	const now = new Date();

	const vehiclesWithoutOwner = [];

	const customersData = (customers ?? []).map((cus, index) => {
		const vehicleLicensePlate = cus.vehicleLicensePlate?.trim();

		if (vehicleLicensePlate) {
			vehiclesWithoutOwner.push({
				licensePlate: vehicleLicensePlate,
				customerIndex: index,
			});
		}

		return {
			fullName: cus.fullName,
			gender: cus.sex.toLowerCase(),
			isContractOwner: index === 0,
			birthdate: cus.dob,
			permanentAddress: cus.address,
			phone: cus.phone,
			avatar: '',
			cccd: cus.cccd,
			cccdIssueDate: cus.cccdIssueDate,
			cccdIssueAt: cus.cccdIssueAt,
			status: CUSTOMER_STATUS['ACTIVE'],
			room: roomId,
			temporaryResidence: false,
			checkinDate: now,
			checkoutDate: contractEndDate,
			contract: contractId,
		};
	});

	const createdCustomers = await Services.customers.importCustomers(customersData);

	const ownerId = createdCustomers.find((customer) => customer.isContractOwner)?._id;

	if (!ownerId) {
		throw new ConflictError('Không tìm thấy khách hàng đứng tên hợp đồng');
	}

	await Services.contracts.importCustomerRef(contractId, ownerId);

	if (vehiclesWithoutOwner.length > 0) {
		const vehicles = vehiclesWithoutOwner.map((vehicleData) => ({
			licensePlate: vehicleData.licensePlate,
			fromDate: now,
			owner: createdCustomers[vehicleData.customerIndex]._id,
			image: '',
			room: roomId,
			status: vehicleStatus['ACTIVE'],
			contract: contractId,
		}));

		await Services.vehicles.importVehicles(vehicles);
	}
};

exports.formatDepositReceiptStatus = (paidAmount, amount) => {
	if (paidAmount >= amount) return receiptStatus['PAID'];
	if (paidAmount === 0) return receiptStatus['PENDING'];
	return receiptStatus['PARTIAL'];
};

exports.generatePreviewContractDocument = async ({ contractDocument, buildingId }) => {
	const generatedContractDoc = await generateContractDocument(contractDocument, buildingId);
	console.log('log of generatedContractDoc: ', generatedContractDoc);

	const tempDir = path.join(process.cwd(), 'files', 'temp');

	await fs.promises.mkdir(tempDir, { recursive: true });

	const filePath = path.join(tempDir, generatedContractDoc.originalname);

	await fs.promises.writeFile(filePath, generatedContractDoc.buffer);

	return {
		originalname: generatedContractDoc.originalname,
		mimetype: 'application/pdf',
		path: filePath,
		previewId: generatedContractDoc.originalname,
		size: generatedContractDoc.buffer.length,
		buffer: generatedContractDoc.buffer,
		createdAt: new Date(),
		expAt: new Date(Date.now() + previewContractPdfExp),
	};
};
