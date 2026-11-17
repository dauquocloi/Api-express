const fs = require('fs');
const path = require('path');
const { feeUnit, previewDepositPdfExp, DEPOSIT_DOCUMENT_FIELDS, FEE_UNIT_TYPE } = require('../constants');
const generateDepositDocument = require('../utils/generatePdfDeposit');
const numberToVietnameseWords = require('../utils/numberToVietnameseWords');
const moment = require('moment');
const capitalizeFirstLetter = require('../utils/capitalizeFirstLetter');

const formatDepositFees = ({ fees, listFees }) => {
	if (!Array.isArray(fees) || !Array.isArray(listFees)) return [];

	const feeMap = new Map(listFees.map((fee) => [fee.feeKey, fee]));

	const depositFees = [];

	for (const feeItem of fees) {
		const match = feeMap.get(feeItem.feeKey);

		if (!match) continue;

		if (match.unit === feeUnit['INDEX']) {
			depositFees.push({
				feeName: match.feeName,
				unit: match.unit,
				firstIndex: match.firstIndex,
				feeAmount: feeItem.feeAmount,
				lastIndex: feeItem?.lastIndex,
				iconPath: match.iconPath,
				feeKey: match.feeKey,
			});
		} else {
			depositFees.push({
				feeName: match.feeName,
				unit: match.unit,
				feeAmount: feeItem.feeAmount,
				iconPath: match.iconPath,
				feeKey: match.feeKey,
			});
		}
	}

	return depositFees;
};

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
	const { FULLNAME, DOB, ADDRESS, CCCD, CCCD_DATE, CCCD_AT, PHONE } = DEPOSIT_DOCUMENT_FIELDS.CUSTOMER_FIELDS;

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
	const { NAME, AMOUNT, TYPE } = DEPOSIT_DOCUMENT_FIELDS.FEE_FIELDS;

	return fees.map((fee) => ({
		[NAME]: fee.feeName ?? '',
		[AMOUNT]: String(fee.feeAmount ?? ''),
		[TYPE]: FEE_UNIT_TYPE[fee.unit] || '',
	}));
};

const formatInteriors = (interiors = []) => {
	const { NAME, QUANT } = DEPOSIT_DOCUMENT_FIELDS.INTERIOR_FIELDS;

	return interiors.map((item) => ({
		[NAME]: capitalizeFirstLetter(item.interiorName),
		[QUANT]: capitalizeFirstLetter(String(item.quantity)),
	}));
};

const formatDepositDocument = ({
	roomIndex,
	customerInfo = {},
	fees = [],
	interiors = [],
	depositAmount,
	contractSignDate,
	contractEndDate,
	contractTerm,
	rent,
	checkinDate,
	note,
}) => {
	const fields = DEPOSIT_DOCUMENT_FIELDS;
	return {
		[fields.ROOM_INDEX]: roomIndex ?? '',
		[fields.CREATED_DATE]: formatDate(new Date()),

		[fields.PARTY_B]: formatCustomer(customerInfo),

		[fields.FEES]: formatFees(fees),

		[fields.INTERIORS]: formatInteriors(interiors),

		[fields.DEPOSIT_AMOUNT]: String(depositAmount ?? ''),

		[fields.DEPOSIT_AMOUNT_WORDS]: numberToVietnameseWords(depositAmount ?? 0),

		[fields.CONTRACT_SIGN_DATE]: moment(contractSignDate).format('DD/MM/YYYY'),

		[fields.CONTRACT_END_DATE]: moment(contractEndDate).format('DD/MM/YYYY'),

		[fields.CHECKIN_DATE]: moment(checkinDate).format('DD/MM/YYYY'),

		[fields.TERM]: contractTerm ?? '',

		[fields.RENT]: String(rent ?? 0),

		[fields.NOTE]: note ?? '',
	};
};

const generatePreviewDepositTermDocument = async ({ depositDocument, buildingId }) => {
	const generateDepositDoc = await generateDepositDocument(depositDocument, buildingId);
	console.log('log of generateDepositDoc: ', generateDepositDoc);

	const tempDir = path.join(process.cwd(), 'files', 'temp');

	await fs.promises.mkdir(tempDir, { recursive: true });

	const filePath = path.join(tempDir, generateDepositDoc.originalname);

	await fs.promises.writeFile(filePath, generateDepositDoc.buffer);

	return {
		originalname: generateDepositDoc.originalname,
		mimetype: 'application/pdf',
		path: filePath,
		previewId: generateDepositDoc.originalname,
		size: generateDepositDoc.buffer.length,
		buffer: generateDepositDoc.buffer,
		createdAt: new Date(),
		expAt: new Date(Date.now() + previewDepositPdfExp),
	};
};

module.exports = {
	formatDepositFees,
	formatDepositDocument,
	generatePreviewDepositTermDocument,
};
