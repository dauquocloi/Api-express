const { BadRequestError } = require('../../AppError');
const { feeUnit: FEE_UNIT } = require('../../constants/fees');
const { vehicleStatus } = require('../../constants/vehicle');
const feesInitial = require('../../utils/getListFeeInital');
const { roomState: ROOM_STATE } = require('../../constants/rooms');
const Services = require('../../service');
const { contractStatus: CONTRACT_STATUS } = require('../../constants/contracts');
const generateContractCode = require('../../utils/generateContractCode');

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

			if (feeInfo.unit === FEE_UNIT['INDEX']) {
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

const createRooms = async ({ data, buildingId, session }) => {
	const roomData = data.map((room) => ({
		building: buildingId,
		roomIndex: room.roomIndex?.toString()?.trim() || '',
		roomPrice: Number(room.roomPrice),
		roomState: room.roomState,
		interior: parseInteriors(room),
	}));

	const roomsCreated = await Services.rooms.importRooms(roomData, session);

	const roomMap = new Map();

	roomsCreated.forEach((room) => {
		roomMap.set(room.roomIndex, room._id);
	});

	return {
		roomsCreated,
		roomMap,
	};
};

const createDepositReceipts = async ({ data, roomMap, session, ownerId }) => {
	const depositReceiptData = data
		.filter((room) => room.roomState !== ROOM_STATE['UN_HIRED'])
		.map((room) => ({
			room: roomMap.get(room.roomIndex.trim()),
			roomIndex: room.roomIndex.trim(),
			amount: Number(room.deposit),
			paidAmount: Number(room.depositPaidAmount),
			date: new Date(room.depositPaidDate),
			month: new Date(room.signDate).getMonth() + 1,
			year: new Date(room.signDate).getFullYear(),
			creater: ownerId,
		}));

	const receipts = await Services.receipts.importReceiptsDeposit(depositReceiptData, session);

	const depositReceiptMap = new Map();

	receipts.forEach((receipt) => {
		depositReceiptMap.set(receipt.room.toString(), receipt._id);
	});

	return {
		receipts,
		depositReceiptMap,
	};
};

const createDepositTransactions = async ({ receipts, ownerId, session }) => {
	const payload = receipts.map((receipt) => ({
		collector: ownerId,
		receipt: receipt._id,
		amount: receipt.paidAmount,
		createdAt: receipt.createdAt,
		month: receipt.month,
		year: receipt.year,
	}));

	return Services.transactions.importCashTransactions(payload, session);
};

const createFees = async ({ data, roomMap, ownerId, session }) => {
	const feesData = [];

	data.forEach((room) => {
		const fees = parseFees(room);

		fees.forEach((fee) => {
			feesData.push({
				...fee,
				room: roomMap.get(room.roomIndex.trim()),
			});
		});
	});

	const createdFees = await Services.fees.importFees(feesData, session);

	const feeIndexHistoryPayload = createdFees
		.filter((fee) => fee.unit === FEE_UNIT['INDEX'])
		.map((fee) => ({
			feeKey: fee.feeKey,
			fee: fee._id,
			room: fee.room,
			lastIndex: fee.lastIndex,
			prevIndex: fee.lastIndex,
			lastUpdated: new Date(),
			prevUpdated: new Date(),
			lastEditor: ownerId,
			prevEditor: ownerId,
		}));

	await Services.fees.createFeeIndexHistory(feeIndexHistoryPayload, session);

	return createdFees;
};

const createContracts = async ({ data, roomMap, depositReceiptMap, session }) => {
	const contractData = [];

	for (const room of data) {
		if (room.roomState === ROOM_STATE['UN_HIRED']) continue;

		const roomId = roomMap.get(room.roomIndex.trim());

		contractData.push({
			room: roomId,
			rent: Number(room.rent),
			depositReceiptId: depositReceiptMap.get(roomId.toString()),
			contractSignDate: new Date(room.signDate),
			contractEndDate: new Date(room.endDate),
			contractTerm: room.contractTerm.trim(),
			note: room.contractNote?.trim() ?? '',
			status: CONTRACT_STATUS['ACTIVE'],
			contractCode: await generateContractCode(process.env.CONTRACT_CODE_LENGTH),
		});
	}

	const contracts = await Services.contracts.importContracts(contractData, session);

	const contractMap = new Map();

	contracts.forEach((contract) => {
		contractMap.set(contract.room.toString(), contract._id);
	});

	return {
		contracts,
		contractMap,
	};
};

const createCustomers = async ({ data, roomMap, contractMap, session }) => {
	const customerData = [];
	const customerMap = new Map();

	data.forEach((room, rowIndex) => {
		if (room.roomState === ROOM_STATE['UN_HIRED']) return;

		const roomId = roomMap.get(room.roomIndex.trim());

		const contractId = contractMap.get(roomId.toString());

		const customers = parseCustomers(room, roomId, contractId);

		customers.forEach((customer, index) => {
			customerData.push({
				_rowIndex: rowIndex,
				_clientIndex: index + 1,
				data: customer,
			});
		});
	});

	const createdCustomers = await Services.customers.importCustomers(
		customerData.map((c) => c.data),
		session,
	);

	createdCustomers.forEach((customer, i) => {
		const { _rowIndex, _clientIndex } = customerData[i];
		const key = `${_rowIndex}_${_clientIndex}`;
		customerMap.set(key, customer._id);
	});

	return {
		customerData,
		createdCustomers,
		customerMap,
	};
};

const linkContractOwners = async ({ contracts, createdCustomers, session }) => {
	const ownerCustomers = createdCustomers.filter((c) => c.isContractOwner);

	const ownerByContract = new Map();

	for (const customer of ownerCustomers) {
		const contractId = customer.contract.toString();

		if (ownerByContract.has(contractId)) {
			throw new BadRequestError(`Contract ${contractId} có nhiều chủ hợp đồng`);
		}

		ownerByContract.set(contractId, customer._id);
	}

	contracts.forEach((contract) => {
		if (!ownerByContract.has(contract._id.toString())) {
			throw new BadRequestError(`Contract ${contract._id} không có chủ hợp đồng`);
		}
	});

	await Services.contracts.importManyCustomerRef(ownerByContract, session);
};

const createVehicles = async ({ data, roomMap, contractMap, customerMap, session }) => {
	const vehicleData = [];

	data.forEach((row, rowIndex) => {
		if (row.roomState === ROOM_STATE['UN_HIRED']) return;

		const roomId = roomMap.get(row.roomIndex.trim());

		const contractId = contractMap.get(roomId.toString());

		vehicleData.push(...parseVehicles(row, roomId, contractId, rowIndex, customerMap));
	});

	return Services.vehicles.importVehicles(vehicleData, session);
};

module.exports = {
	parseInteriors,
	parseFees,
	parseCustomers,
	parseVehicles,
	createRooms,
	createFees,
	createContracts,
	createCustomers,
	linkContractOwners,
	createVehicles,
	createDepositReceipts,
	createDepositTransactions,
};
