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
	addDepositReceiptPayer,
} = require('./utils');
const Services = require('../../service');
const { BadRequestError, InternalError } = require('../../AppError');
const getCurrentPeriod = require('../../utils/getCurrentPeriod');

exports.importRooms = async (data) => {
	const { buildingId, ownerId, roomFile } = data;
	let contractIds = [];

	const building = await Services.buildings.findById(buildingId).lean().exec();
	if (!building) throw new BadRequestError('Building not found');

	let workBook = XLSX.read(roomFile.buffer, { type: 'buffer' });
	let workSheet = workBook.Sheets[workBook.SheetNames[0]];
	const jsonData = XLSX.utils.sheet_to_json(workSheet);

	const { roomMap } = await createRooms({ data: jsonData, buildingId });

	// First Statistics need to be installed.
	const { currentMonth, currentYear } = await getCurrentPeriod(buildingId);

	const { receipts, depositReceiptMap } = await createDepositReceipts({
		data: jsonData,
		roomMap,
		ownerId: ownerId,
		includeDepositRevenue: building.includeDepositRevenue,
		currentMonth,
		currentYear,
	});

	console.log('receipts: ', receipts);

	const depositTransactions = await createDepositTransactions({ receipts: receipts, ownerId: ownerId });

	console.log('depositTransactions: ', depositTransactions);

	const { createdFees, feesMap } = await createFees({ data: jsonData, roomMap, ownerId: ownerId });

	const { contracts, contractMap } = await createContracts({ data: jsonData, roomMap, depositReceiptMap, feesMap: feesMap, ownerId });
	contractIds = contracts.map((c) => c._id);

	console.log('contracts: ', contracts);

	const { customerData, createdCustomers, customerMap, contractOwnerMap } = await createCustomers({ data: jsonData, roomMap, contractMap });
	console.log('customerData', customerData);

	await addDepositReceiptPayer({ contractMap, contractOwnerMap });

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

	// throw new InternalError('stop for testing');

	await addGenerateContractPdfJobs(contractIds, buildingId);

	return 'Success';
};
