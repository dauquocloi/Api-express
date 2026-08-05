const mongoose = require('mongoose');
const Entity = require('../../models');
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
const { BadRequestError } = require('../../AppError');
const generateContractCode = require('../../utils/generateContractCode');
const { feeUnit } = require('../../constants/fees');

exports.importRooms = async (data) => {
	let session;
	let contractIds = [];
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const building = await Services.buildings.findById(data.buildingId).session(session).lean().exec();
			if (!building) throw new BadRequestError('Building not found');

			let workBook = XLSX.read(data.roomFile.buffer, { type: 'buffer' });
			let workSheet = workBook.Sheets[workBook.SheetNames[0]];
			const jsonData = XLSX.utils.sheet_to_json(workSheet);

			const { roomMap } = await createRooms({ data: jsonData, buildingId: building._id, session });

			const { receipts, depositReceiptMap } = await createDepositReceipts({ data: jsonData, roomMap, ownerId: data.ownerId, session });

			const depositTransactions = await createDepositTransactions({ receipts: receipts, ownerId: data.ownerId, session });

			const { createdFees, feesMap } = await createFees({ data: jsonData, roomMap, ownerId: data.ownerId, session });

			const { contracts, contractMap } = await createContracts({ data: jsonData, roomMap, depositReceiptMap, feesMap: feesMap, session });
			contractIds = contracts.map((c) => c._id);

			const { customerData, createdCustomers, customerMap } = await createCustomers({ data: jsonData, roomMap, contractMap, session });

			await linkContractOwners({
				contracts,
				createdCustomers,
				session,
			});

			await createVehicles({
				data: jsonData,
				roomMap,
				contractMap,
				customerMap,
				session,
			});
		});

		await addGenerateContractPdfJobs(contractIds, data.buildingId);

		return 'Success';
	} finally {
		if (session) {
			session.endSession();
		}
	}
};
