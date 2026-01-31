const { BadRequestError } = require('../../AppError');
const { feeUnit } = require('../../constants/fees');
const { vehicleStatus } = require('../../constants/vehicle');
const feesInitial = require('../../utils/getListFeeInital');
function parseInteriors(row) {
	const interiorsMap = {};

	Object.keys(row).forEach((key) => {
		// match interior + số
		let match = key.match(/^interior(\d+)$/);
		if (match) {
			const idx = match[1];
			interiorsMap[idx] ??= {};
			interiorsMap[idx].interiorName = row[key];
			return;
		}

		match = key.match(/^interiorRentalDate(\d+)$/);
		if (match) {
			const idx = match[1];
			interiorsMap[idx] ??= {};
			interiorsMap[idx].interiorRentalDate = row[key];
			return;
		}

		match = key.match(/^interiorQuantity(\d+)$/);
		if (match) {
			const idx = match[1];
			interiorsMap[idx] ??= {};
			interiorsMap[idx].quantity = Number(row[key]) || 0;
		}
	});

	// Convert map → array & filter empty
	return Object.values(interiorsMap).filter((i) => i.interiorName);
}

function parseFees(row) {
	const feesMap = {};
	const feeInitialMap = new Map(feesInitial.map((fee) => [fee.feeKey, fee]));

	Object.keys(row).forEach((key) => {
		let match = key.match(/^feeKey(\d+)$/);
		if (match) {
			const idx = match[1];
			feesMap[idx] ??= {};
			feesMap[idx].feeKey = row[key];
			return;
		}

		match = key.match(/^feeAmount(\d+)$/);
		if (match) {
			const idx = match[1];
			feesMap[idx] ??= {};
			feesMap[idx].feeAmount = Number(row[key]) || 0;
		}

		match = key.match(/^lastIndex(\d+)$/);
		if (match) {
			const idx = match[1];
			feesMap[idx] ??= {};
			feesMap[idx].lastIndex = Number(row[key]) || 0;
		}
	});

	return Object.values(feesMap)
		.filter((i) => i.feeKey)
		.map((i) => {
			const feeInfo = feeInitialMap.get(i.feeKey);

			if (!feeInfo) {
				// return {
				// 	feeKey: i.feeKey,
				// 	feeAmount: i.feeAmount,
				// 	lastIndex: i.lastIndex,
				// };
				throw new BadRequestError(`Fee key không hợp lệ: ${i.feeKey}`);
			}

			const result = {
				feeKey: i.feeKey,
				feeName: feeInfo.feeName,
				unit: feeInfo.unit,
				iconPath: feeInfo.iconPath,
				feeAmount: i.feeAmount,
			};

			if (feeInfo.unit === feeUnit['INDEX']) {
				result.lastIndex = i.lastIndex ?? 0;
			}

			return result;
		});
}

function parseCustomers(row, roomId, contractId) {
	const customerMap = {};

	Object.keys(row).forEach((key) => {
		let match;

		match = key.match(/^customerName(\d+)$/);
		if (match) {
			const idx = match[1];
			customerMap[idx] ??= {};
			customerMap[idx].fullName = row[key]?.trim();
			return;
		}

		match = key.match(/^phone(\d+)$/);
		if (match) {
			const idx = match[1];
			customerMap[idx] ??= {};
			customerMap[idx].phone = row[key]?.toString().trim();
			return;
		}

		match = key.match(/^sex(\d+)$/);
		if (match) {
			const idx = match[1];
			customerMap[idx] ??= {};
			const gender = row[key]?.toLowerCase().trim();
			customerMap[idx].gender = gender === 'nam' || gender === 'nữ' ? gender : undefined;
			return;
		}

		match = key.match(/^date(\d+)$/);
		if (match) {
			const idx = match[1];
			customerMap[idx] ??= {};
			customerMap[idx].birthdate = row[key] ? new Date(row[key]) : undefined;
			return;
		}

		match = key.match(/^checkinDate(\d+)$/);
		if (match) {
			const idx = match[1];
			customerMap[idx] ??= {};
			customerMap[idx].checkinDate = row[key] ? new Date(row[key]) : undefined;
			return;
		}

		match = key.match(/^CCCD(\d+)$/);
		if (match) {
			const idx = match[1];
			customerMap[idx] ??= {};
			customerMap[idx].cccd = row[key]?.toString().trim();
			return;
		}

		match = key.match(/^issueDate(\d+)$/);
		if (match) {
			const idx = match[1];
			customerMap[idx] ??= {};
			customerMap[idx].cccdIssueDate = row[key] ? new Date(row[key]) : undefined;
			return;
		}

		match = key.match(/^permanentAddress(\d+)$/);
		if (match) {
			const idx = match[1];
			customerMap[idx] ??= {};
			customerMap[idx].permanentAddress = row[key]?.trim();
			return;
		}

		match = key.match(/^temporaryResidence(\d+)$/);
		if (match) {
			const idx = match[1];
			customerMap[idx] ??= {};
			customerMap[idx].temporaryResidence = Boolean(row[key]);
		}
	});

	// sort theo index tăng dần để xác định "customer đầu tiên"
	const sortedCustomers = Object.entries(customerMap)
		.filter(([_, c]) => c.fullName && c.cccd)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([_, c], index) => ({
			...c,
			room: roomId,
			contract: contractId,
			status: 1, // đang ở
			isContractOwner: index === 0,
		}));

	return sortedCustomers;
}

function parseVehicles(data, roomId, contractId, rowIndex, customerMap) {
	const vehicles = [];

	for (let i = 1; i <= 2; i++) {
		const plate = data[`licensePlate${i}`];
		if (!plate || !plate.trim()) continue;

		const ownerKey = `${rowIndex}_${i}`;
		const ownerId = customerMap.get(ownerKey);

		vehicles.push({
			licensePlate: plate.trim(),
			fromDate: data[`fromDate${i}`] ? new Date(data[`fromDate${i}`]) : undefined,
			owner: ownerId,
			room: roomId,
			contract: contractId,
			status: 'active',
		});
	}

	return vehicles;
}

module.exports = { parseInteriors, parseFees, parseCustomers, parseVehicles };
