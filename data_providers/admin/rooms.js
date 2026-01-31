const mongoose = require('mongoose');
var Entity = require('../../models');
const bcrypt = require('bcrypt');
const { query } = require('express');
var XLSX = require('xlsx');
const fs = require('fs');
const { parseInteriors, parseFees, parseCustomers, parseVehicles } = require('./utils');
const Services = require('../../service');
const { BadRequestError } = require('../../AppError');
const { contractStatus } = require('../../constants/contracts');
const generateContractCode = require('../../utils/generateContractCode');
const { feeUnit } = require('../../constants/fees');

exports.importRooms = async (data) => {
	let session;
	let result;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const building = await Services.buildings.findById(data.buildingId).session(session).lean().exec();
			if (!building) throw new BadRequestError('Building not found');

			let workBook = XLSX.read(data.roomFile.buffer, { type: 'buffer' });
			let workSheet = workBook.Sheets[workBook.SheetNames[0]];
			const jsonData = XLSX.utils.sheet_to_json(workSheet);

			let roomData = [];
			let depositReceiptData = [];
			let depositReceiptCashTransactionData = [];
			let contractData = [];
			let customerData = [];
			let vehicleData = [];
			let feesData = [];
			// let interiorData;

			jsonData.forEach((data) => {
				roomData.push({
					building: building._id,
					roomIndex: data.roomIndex.toString().trim(),
					roomPrice: Number(data.roomPrice),
					roomState: data.roomState,
					interior: parseInteriors(data),
				});
			});
			const roomsCreated = await Services.rooms.importRooms(roomData, session);
			const roomMap = new Map();
			roomsCreated.forEach((room) => {
				roomMap.set(room.roomIndex.trim(), room._id);
			});

			jsonData.forEach((data, index) => {
				if (data.roomState === 0) return;
				depositReceiptData.push({
					room: roomMap.get(data.roomIndex.trim()),
					roomIndex: data.roomIndex.trim(),
					amount: Number(data.deposit),
					paidAmount: Number(data.depositPaidAmount),
					date: data.depositPaidDate,
					month: new Date(data.signDate).getMonth() + 1,
					year: new Date(data.signDate).getFullYear(),
				});
			});
			const receiptDepositCreated = await Services.receipts.importReceiptsDeposit(depositReceiptData, session);
			console.log('log of receiptDepositCreated: ', receiptDepositCreated);

			depositReceiptCashTransactionData = receiptDepositCreated.map((receipt) => ({
				receipt: receipt._id,
				amount: receipt.paidAmount,
				collector: data.ownerId,
				createdAt: receipt.createdAt,
				month: receipt.month,
				year: receipt.year,
			}));

			const createdTransaction = await Services.transactions.importCashTransactions(depositReceiptCashTransactionData, session);
			const depositReceiptMap = new Map();

			receiptDepositCreated.forEach((receipt) => {
				depositReceiptMap.set(receipt.room.toString(), receipt._id);
			});
			console.log('log of createdTransaction: ', createdTransaction);

			jsonData.forEach((data) => {
				const fees = parseFees(data);

				fees.forEach((i) => {
					feesData.push({
						...i,
						room: roomMap.get(data.roomIndex.trim()),
					});
				});
			});
			const createdFees = await Services.fees.importFees(feesData, session);
			const feeIndexHistoryPayload = createdFees
				.filter((fee) => fee.unit === feeUnit['INDEX'])
				.map((fee) => ({
					feeKey: fee.feeKey,
					fee: fee._id,
					room: fee.room,
					lastIndex: fee.lastIndex,
					prevIndex: fee.lastIndex,
					lastUpdated: new Date(),
					prevUpdated: new Date(),
					lastEditor: data.ownerId,
					prevEditor: data.ownerId,
				}));
			const result = await Services.fees.createFeeIndexHistory(feeIndexHistoryPayload, session);
			console.log('feeIndexHistoryResult: ', result);
			// console.log('log of createdFees: ', createdFees);

			for (const data of jsonData) {
				if (data.roomState === 0) continue;

				const roomId = roomMap.get(data.roomIndex.trim());

				contractData.push({
					room: roomId,
					rent: Number(data.rent),
					depositReceiptId: depositReceiptMap.get(roomId.toString()),
					contractSignDate: new Date(data.signDate),
					contractEndDate: new Date(data.endDate),
					contractTerm: data.contractTerm.trim(),
					note: data.contractNote?.trim() ?? '',
					status: contractStatus['ACTIVE'],
					contractCode: await generateContractCode(process.env.CONTRACT_CODE_LENGTH),
				});
			}

			const createdContracts = await Services.contracts.importContracts(contractData, session);
			console.log('log of createdContracts: ', createdContracts);
			const contractMap = new Map();
			createdContracts.forEach((contract) => {
				contractMap.set(contract.room.toString(), contract._id);
			});

			jsonData.forEach((data, rowIndex) => {
				if (data.roomState === 0) return;

				const roomId = roomMap.get(data.roomIndex.trim());
				const contractId = contractMap.get(roomId.toString());
				const customers = parseCustomers(data, roomId, contractId);

				customers.forEach((c, clientIndex) => {
					customerData.push({
						_rowIndex: rowIndex,
						_clientIndex: clientIndex + 1,
						data: c,
					});
				});
			});

			console.log('log of customerData: ', customerData);
			const createdCustomers = await Services.customers.importCustomers(
				customerData.map((c) => c.data),
				session,
			);
			console.log('log of createdCustomers: ', createdCustomers);
			const ownerCustomers = createdCustomers.filter((c) => c.isContractOwner === true);
			const ownerByContract = new Map();

			for (const c of ownerCustomers) {
				const contractId = c.contract.toString();

				if (ownerByContract.has(contractId)) {
					throw new BadRequestError(`Contract ${contractId} có nhiều chủ hợp đồng`);
				}

				ownerByContract.set(contractId, c._id);
			}
			createdContracts.forEach((contract) => {
				if (!ownerByContract.has(contract._id.toString())) {
					throw new BadRequestError(`Contract ${contract._id} không có chủ hợp đồng`);
				}
			});
			await Services.contracts.importManyCustomerRef(ownerByContract, session);

			const customerMap = new Map();
			createdCustomers.forEach((customer, i) => {
				const { _rowIndex, _clientIndex } = customerData[i];
				const key = `${_rowIndex}_${_clientIndex}`;
				customerMap.set(key, customer._id);
			});

			console.log('log of customerMap: ', customerMap);
			jsonData.forEach((data, rowIndex) => {
				if (data.roomState === 0) return;

				const roomId = roomMap.get(data.roomIndex.trim());
				const contractId = contractMap.get(roomId.toString());

				vehicleData.push(...parseVehicles(data, roomId, contractId, rowIndex, customerMap));
			});

			const createdVehicles = await Services.vehicles.importVehicles(vehicleData, session);
			console.log('log of createdVehicles: ', createdVehicles);

			// throw new BadRequestError('Stop transaction for testing');
			return 'success';
		});
		return 'Import rooms successfully';
	} catch (error) {
		throw error;
	} finally {
		if (session) {
			session.endSession();
		}
	}
};
