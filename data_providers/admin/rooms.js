const XLSX = require('xlsx');
const fs = require('fs');
const {
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
	addGenerateContractPdfJobs,
} = require('./utils');
const Services = require('../../service');
const { BadRequestError, InternalError } = require('../../AppError');

exports.importRooms = async (data) => {
	const { buildingId, ownerId, roomFile } = data;
	let contractIds = [];

	// const building = await Services.buildings.findById(buildingId).lean().exec();
	// if (!building) throw new BadRequestError('Building not found');

	let workBook = XLSX.read(roomFile.buffer, { type: 'buffer' });
	let workSheet = workBook.Sheets[workBook.SheetNames[0]];
	const jsonData = XLSX.utils.sheet_to_json(workSheet);

	const { roomMap } = await createRooms({ data: jsonData, buildingId });

	const { receipts, depositReceiptMap } = await createDepositReceipts({ data: jsonData, roomMap, ownerId: ownerId });

	const depositTransactions = await createDepositTransactions({ receipts: receipts, ownerId: ownerId });

	const { createdFees, feesMap } = await createFees({ data: jsonData, roomMap, ownerId: ownerId });

	const { contracts, contractMap } = await createContracts({ data: jsonData, roomMap, depositReceiptMap, feesMap: feesMap });
	contractIds = contracts.map((c) => c._id);

	const { customerData, createdCustomers, customerMap } = await createCustomers({ data: jsonData, roomMap, contractMap });

	await linkContractOwners({
		contracts,
		createdCustomers,
	});

	await createVehicles({
		data: jsonData,
		roomMap,
		contractMap,
		customerMap,
	});

	throw new InternalError('stop for testing');

	await addGenerateContractPdfJobs(contractIds, buildingId);

	return 'Success';
};
