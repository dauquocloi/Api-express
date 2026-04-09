const mongoose = require('mongoose');
const Entity = require('../models');
const { NotFoundError, BadRequestError } = require('../AppError');
const Services = require('../service');
const { client: redis } = require('../config').redisDb;
const { generateCT01Html, htmlToPdf } = require('../utils/html2pdf');
const dayjs = require('dayjs');

exports.editCustomer = async (data, redisKey) => {
	let customerId = new mongoose.Types.ObjectId(`${data.customerId}`);

	const customerInfo = await Entity.CustomersEntity.findById(customerId);
	if (!customerInfo) {
		throw new NotFoundError('Khách hàng không tồn tại');
	}

	Object.assign(customerInfo, data); // Gán dữ liệu mới vào document

	const updatedCustomer = await customerInfo.save();

	await redis.set(redisKey, `SUCCESS:${updatedCustomer}`, 'EX', process.env.REDIS_EXP_SEC);
	return updatedCustomer;
};

exports.addCustomer = async (data, redisKey, userId) => {
	const roomId = new mongoose.Types.ObjectId(data.roomId);
	await Services.rooms.assertRoomWritable({ roomId, userId });
	const currentRoom = await Services.rooms.findById(roomId).lean().exec();
	if (!currentRoom) throw new NotFoundError('Phòng không tồn tại !');
	if (currentRoom.roomState === 0) throw new BadRequestError('Không thể thêm khách cho phòng đang trống !');
	const contract = await Services.contracts.findByRoomId(roomId).lean().exec();
	if (!contract) throw new NotFoundError('Phòng không tồn tại hợp đồng !');

	const newCustomerInfo = {
		roomId: roomId,
		fullName: data.fullName,
		gender: data.gender,
		isContractOwner: data?.isContractOwner ?? false,
		birthdate: data.birthdate,
		permanentAddress: data.permanentAddress,
		phone: data.phone,
		cccd: data.cccd,
		cccdIssueDate: data.cccdIssueDate,
		cccdIssueAt: data.cccdIssueAt,
		contractId: contract._id,
	};

	const customer = await Services.customers.addCustomer(newCustomerInfo);

	const result = {
		_id: customer._id,
		fullName: customer.fullName,
		avatar: customer.avatar,
		phone: customer.phone,
		roomId: customer.room,
	};
	await redis.set(redisKey, `SUCCESS:${result}`, 'EX', process.env.REDIS_EXP_SEC);

	return result;
};

exports.setCustomerStatus = async (customerId, status, redisKey) => {
	try {
		const currentCustomer = await Services.customers.findById(customerId).lean().exec();
		if (!currentCustomer) throw new NotFoundError('Khách hàng không tồn tại !');

		currentCustomer.status = status;
		await currentCustomer.save();

		await redis.set(redisKey, `SUCCESS:${JSON.stringify({})}`, 'EX', process.env.REDIS_EXP_SEC);
		return 'Success';
	} catch (error) {
		await redis.set(redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	}
};

exports.getListSelectingCustomer = async (roomId) => {
	const customersInfo = await Entity.CustomersEntity.find({ room: roomId, status: { $in: [1, 2] } });
	const customers = customersInfo.map((cus) => ({
		_id: cus._id,
		fullName: cus.fullName,
	}));
	return customers;
};

exports.getAllCustomers = async (buildingId, status) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const customers = await Services.customers.getAllCustomers(buildingObjectId, status);
	return customers;
};

exports.changeContractOwner = async (customerId, redisKey) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentCustomer = await Services.customers.findById(customerId).session(session).lean().exec();
			console.log('log of currentCustomer: ', currentCustomer);
			if (!currentCustomer) throw new NotFoundError('Khách hàng không tồn tại !');
			if (currentCustomer.isContractOwner) return;

			await Services.customers.resetContractOwner(currentCustomer.contract, session);
			await Services.customers.setIsContractOwner(customerId, session);

			return 'Success';
		});

		await redis.set(redisKey, `SUCCESS:${JSON.stringify({})}`, 'EX', process.env.REDIS_EXP_SEC);

		return 'Success';
	} catch (error) {
		await redis.set(redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.deleteCustomer = async (customerId, userId) => {
	const currentCustomer = await Services.customers.findById(customerId);
	if (!currentCustomer) throw new NotFoundError('Dữ liệu không tồn tại');
	if (currentCustomer.status === 0) throw new BadRequestError('Không thể xóa thông tin khách đã dọn đi !');
	if (currentCustomer.isContractOwner) throw new BadRequestError('Không thể xóa chủ hộ');

	await Services.rooms.assertRoomWritable({ roomId: currentCustomer.room, userId });

	await Services.customers.setCustomerLeft(customerId);
	return 'Success';
};

exports.exportCT01PdfFile = async (customerId, redisKey) => {
	try {
		const currentCustomer = await Services.customers.findById(customerId).populate({ path: 'room', populate: 'building' }).lean().exec();
		if (!currentCustomer) throw new NotFoundError('Khách hàng không tồn tại !');
		if (currentCustomer.status === 0) throw new BadRequestError('Khách đã dọn đi !');
		if (currentCustomer.temporaryResidence === true) throw new BadRequestError('Khách đã đăng ký tạm trú !');

		let ownerInfo;
		if (currentCustomer.isContractOwner) {
			ownerInfo = currentCustomer;
		} else {
			ownerInfo = await Services.customers.findOwnerByContractId(currentCustomer.contract);
		}

		let data = {
			sendTo: 'Công an phường 6',
			reqFullName: currentCustomer.fullName.toUpperCase(),
			birthDay: dayjs(currentCustomer.birthdate).format('DD/MM/YYYY'),
			gender: currentCustomer.gender,
			reqCCCD: currentCustomer.cccd,
			ownerCCCD: ownerInfo.cccd,
			phone: currentCustomer.phone,
			email: null,
			ownerName: ownerInfo.fullName.toUpperCase(),
			relationship: currentCustomer.isContractOwner === true ? 'Chủ hộ' : 'Người cùng thuê',
			roomIndex: currentCustomer.room.roomIndex,
			buildingAddress: currentCustomer.room.building.buildingAddress,
		};
		const createdCT01Html = generateCT01Html('', data);
		const generatedCT01Pdf = await htmlToPdf(createdCT01Html);
		return generatedCT01Pdf;
	} catch (error) {
		throw error;
	}
};
