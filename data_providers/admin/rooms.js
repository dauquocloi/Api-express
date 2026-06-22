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
} = require('./utils');
const Services = require('../../service');
const { BadRequestError } = require('../../AppError');
const { contractStatus } = require('../../constants/contracts');
const generateContractCode = require('../../utils/generateContractCode');
const { feeUnit } = require('../../constants/fees');

// exports.importRooms = async (data) => {
// 	let session;
// 	let result;
// 	try {
// 		session = await mongoose.startSession();
// 		await session.withTransaction(async () => {
// 			const building = await Services.buildings.findById(data.buildingId).session(session).lean().exec();
// 			if (!building) throw new BadRequestError('Building not found');

// 			let workBook = XLSX.read(data.roomFile.buffer, { type: 'buffer' });
// 			let workSheet = workBook.Sheets[workBook.SheetNames[0]];
// 			const jsonData = XLSX.utils.sheet_to_json(workSheet);

// 			let roomData = [];
// 			let depositReceiptData = [];
// 			let depositReceiptCashTransactionData = [];
// 			let contractData = [];
// 			let customerData = [];
// 			let vehicleData = [];
// 			let feesData = [];
// 			// let interiorData;

// 			jsonData.forEach((room) => {
// 				roomData.push({
// 					building: building._id,
// 					roomIndex: room.roomIndex?.toString()?.trim() || '',
// 					roomPrice: Number(room.roomPrice),
// 					roomState: room.roomState,
// 					interior: parseInteriors(room),
// 				});
// 			});
// 			const roomsCreated = await Services.rooms.importRooms(roomData, session);
// 			const roomMap = new Map();
// 			roomsCreated.forEach((room) => {
// 				roomMap.set(room.roomIndex.trim(), room._id);
// 			});

// 			jsonData.forEach((room, index) => {
// 				if (room.roomState === 0) return;
// 				depositReceiptData.push({
// 					room: roomMap.get(room?.roomIndex.trim()),
// 					roomIndex: room.roomIndex.trim(),
// 					amount: Number(room.deposit),
// 					paidAmount: Number(room.depositPaidAmount),
// 					date: new Date(room.depositPaidDate),
// 					month: new Date(room.signDate).getMonth() + 1,
// 					year: new Date(room.signDate).getFullYear(),
// 				});
// 			});
// 			const receiptDepositCreated = await Services.receipts.importReceiptsDeposit(depositReceiptData, session);
// 			console.log('log of receiptDepositCreated: ', receiptDepositCreated);

// 			depositReceiptCashTransactionData = receiptDepositCreated.map((receipt) => ({
// 				collector: data.ownerId, // Mặc định mọi giao dịch đều được chủ nhà thu !
// 				receipt: receipt._id,
// 				amount: receipt.paidAmount,
// 				createdAt: receipt.createdAt,
// 				month: receipt.month,
// 				year: receipt.year,
// 			}));

// 			const createdTransaction = await Services.transactions.importCashTransactions(depositReceiptCashTransactionData, session);
// 			const depositReceiptMap = new Map();

// 			receiptDepositCreated.forEach((receipt) => {
// 				depositReceiptMap.set(receipt.room.toString(), receipt._id);
// 			});
// 			console.log('log of createdTransaction: ', createdTransaction);

// 			jsonData.forEach((room) => {
// 				const fees = parseFees(room);

// 				fees.forEach((i) => {
// 					feesData.push({
// 						...i,
// 						room: roomMap.get(room.roomIndex?.trim()),
// 					});
// 				});
// 			});
// 			const createdFees = await Services.fees.importFees(feesData, session);
// 			const feeIndexHistoryPayload = createdFees
// 				.filter((fee) => fee.unit === feeUnit['INDEX'])
// 				.map((fee) => ({
// 					feeKey: fee.feeKey,
// 					fee: fee._id,
// 					room: fee.room,
// 					lastIndex: fee.lastIndex,
// 					prevIndex: fee.lastIndex,
// 					lastUpdated: new Date(),
// 					prevUpdated: new Date(),
// 					lastEditor: data.ownerId,
// 					prevEditor: data.ownerId,
// 				}));
// 			const result = await Services.fees.createFeeIndexHistory(feeIndexHistoryPayload, session);
// 			console.log('feeIndexHistoryResult: ', result);
// 			// console.log('log of createdFees: ', createdFees);

// 			for (const room of jsonData) {
// 				if (room.roomState === 0) continue;

// 				const roomId = roomMap.get(room.roomIndex?.trim());

// 				contractData.push({
// 					room: roomId,
// 					rent: Number(room.rent),
// 					depositReceiptId: depositReceiptMap.get(roomId.toString()),
// 					contractSignDate: new Date(room.signDate),
// 					contractEndDate: new Date(room.endDate),
// 					contractTerm: room.contractTerm.trim(),
// 					note: room.contractNote?.trim() ?? '',
// 					status: contractStatus['ACTIVE'],
// 					contractCode: await generateContractCode(process.env.CONTRACT_CODE_LENGTH),
// 				});
// 			}

// 			const createdContracts = await Services.contracts.importContracts(contractData, session);
// 			console.log('log of createdContracts: ', createdContracts);
// 			const contractMap = new Map();
// 			createdContracts.forEach((contract) => {
// 				contractMap.set(contract.room.toString(), contract._id);
// 			});

// 			jsonData.forEach((room, rowIndex) => {
// 				if (room.roomState === 0) return;

// 				const roomId = roomMap.get(room.roomIndex.trim());
// 				const contractId = contractMap.get(roomId.toString());
// 				const customers = parseCustomers(room, roomId, contractId);

// 				customers.forEach((c, clientIndex) => {
// 					customerData.push({
// 						_rowIndex: rowIndex,
// 						_clientIndex: clientIndex + 1,
// 						data: c,
// 					});
// 				});
// 			});

// 			console.log('log of customerData: ', customerData);
// 			const createdCustomers = await Services.customers.importCustomers(
// 				customerData.map((c) => c.data),
// 				session,
// 			);
// 			console.log('log of createdCustomers: ', createdCustomers);
// 			const ownerCustomers = createdCustomers.filter((c) => c.isContractOwner === true);
// 			const ownerByContract = new Map();

// 			for (const c of ownerCustomers) {
// 				const contractId = c.contract.toString();

// 				if (ownerByContract.has(contractId)) {
// 					throw new BadRequestError(`Contract ${contractId} có nhiều chủ hợp đồng`);
// 				}

// 				ownerByContract.set(contractId, c._id);
// 			}
// 			createdContracts.forEach((contract) => {
// 				if (!ownerByContract.has(contract._id.toString())) {
// 					throw new BadRequestError(`Contract ${contract._id} không có chủ hợp đồng`);
// 				}
// 			});
// 			await Services.contracts.importManyCustomerRef(ownerByContract, session);

// 			const customerMap = new Map();
// 			createdCustomers.forEach((customer, i) => {
// 				const { _rowIndex, _clientIndex } = customerData[i];
// 				const key = `${_rowIndex}_${_clientIndex}`;
// 				customerMap.set(key, customer._id);
// 			});

// 			console.log('log of customerMap: ', customerMap);
// 			jsonData.forEach((data, rowIndex) => {
// 				if (data.roomState === 0) return;

// 				const roomId = roomMap.get(data.roomIndex.trim());
// 				const contractId = contractMap.get(roomId.toString());

// 				vehicleData.push(...parseVehicles(data, roomId, contractId, rowIndex, customerMap));
// 			});

// 			const createdVehicles = await Services.vehicles.importVehicles(vehicleData, session);
// 			console.log('log of createdVehicles: ', createdVehicles);

// 			throw new BadRequestError('Stop transaction for testing');
// 			return 'success';
// 		});
// 		return 'Import rooms successfully';
// 	} catch (error) {
// 		throw error;
// 	} finally {
// 		if (session) {
// 			session.endSession();
// 		}
// 	}
// };

exports.importRooms = async (data) => {
	let session;
	try {
		session = await mongoose.startSession();
		return await session.withTransaction(async () => {
			const building = await Services.buildings.findById(data.buildingId).session(session).lean().exec();
			if (!building) throw new BadRequestError('Building not found');

			let workBook = XLSX.read(data.roomFile.buffer, { type: 'buffer' });
			let workSheet = workBook.Sheets[workBook.SheetNames[0]];
			const jsonData = XLSX.utils.sheet_to_json(workSheet);

			const { roomMap } = await createRooms({ data: jsonData, buildingId: building._id, session });

			const { receipts, depositReceiptMap } = await createDepositReceipts({ data: jsonData, roomMap, ownerId: data.ownerId, session });

			const depositTransactions = await createDepositTransactions({ receipts: receipts, ownerId: data.ownerId, session });

			const createdFees = await createFees({ data: jsonData, roomMap, ownerId: data.ownerId, session });

			const { contracts, contractMap } = await createContracts({ data: jsonData, roomMap, depositReceiptMap, session });

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

			return 'success';
		});
	} finally {
		if (session) {
			session.endSession();
		}
	}
};
