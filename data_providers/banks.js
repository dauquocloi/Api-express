const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const { default: axios } = require('axios');

exports.createBank = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		var ownerId = mongoose.Types.ObjectId(data.userId);

		const getBankOwnerName = await axios.post('http://localhost:8080/mb/individual/bankAccount/lookUpAccountHolderName', {
			account_number: data.accoutNumber,
		});
		if (getBankOwnerName.status === 400) {
			throw new Error('Thông tin đầu vào không hợp lệ');
		}
		if (getBankOwnerName.status === 4001) {
			throw new Error('Số tài khoản không tồn tại trên hệ thống MB');
		}
		if (getBankOwnerName.status === 501) {
			throw new Error('Hệ thống MB đang bận');
		}
		if (getBankOwnerName.status === 200) {
			const { data } = getBankOwnerName.data;
			var account_holder_name = data.account_holder_name;
		}

		const companyInfo = await Entity.CompaniesEntity.findOne({ owner: data.userId });
		if (companyInfo == null) {
			throw new Error('Công ty (tổ chức) không tồn tại');
		}

		const bankInfo = {
			company_id: companyInfo?.companyId,
			account_holder_name: account_holder_name,
			account_number: data.accoutNumber,
			identification_Number: data.identificationNumber,
			phone_number: data.phoneNumber,
			label: null,
		};

		// const getListBank = await axios.get(`http://localhost:8080/sepay/bank`);
		// if (getListBank.status != 200) {
		// 	throw new Error('Lỗi khi lấy danh sách ngân hàng');
		// }

		const addBankAccount = await axios.post(`http://localhost:8080/mb/individual/bankAccount/create`, bankInfo);

		switch (createBankAccount.status) {
			case 400:
				throw new Error('Thông tin đầu vào không hợp lệ');
			case 4001:
				throw new Error('Số tài khoản đã tồn tại trên hệ thống Sepay');
			case 4002:
				throw new Error('Số CCCD/CMND và số điện thoại không được đăng ký cho tài khoản ngân hàng');
			case 4003:
				throw new Error('Số CCCD/CMND không được đăng ký cho tài khoản ngân hàng');
			case 4004:
				throw new Error('Số tài khoản không tồn tại trên hệ thống ngân hàng MB');
			case 4005:
				throw new Error('Tên chủ tài khoản không khớp thông tin với tài khoản ngân hàng MB');
			case 4006:
				throw new Error('Số điện thoại không được đăng ký cho tài khoản ngân hàng MB');
			case 504:
				throw new Error('Hệ thống MB đang bận');
			case 2011:
				const { data: responseInfo } = addBankAccount.data;

				const newBankAccount = {
					bankId: addBankAccount.id,
					requestId: responseInfo.request_id,
					brandName: data.brandName,
					fullName: data.fullName,
					shortName: data.shortName,
					code: data.code,
					bin: data.bin,
					logoPath: data.logoPath,
					icon: data.icon,
					active: '0',
					owner: ownerId,
				};
				const createNewBankAccount = await Entity.BanksEntity.create(newBankAccount);
		}
	} catch (error) {
		next(error);
	}
};
