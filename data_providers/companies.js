const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
const axios = require('axios');
var Entity = require('../models');

exports.createCompany = async (data, cb, next) => {
	try {
		const companyInfo = {
			full_name: data.fullName,
			short_name: data.shortName,
		};

		const response = await axios.post('http://localhost:8080/sepay/company/create', companyInfo);
		console.log('log of response: ', response.data);

		if (response.status == 201) {
			const newCompany = {
				companyId: response.data.id,
				fullName: data.fullName,
				shortName: data.shortName,
				status: 'Active',
			};
			const createCompany = await Entity.CompaniesEntity.create(newCompany);
			cb(null, createCompany);
		} else {
			throw new Error('Thông tin đầu vào không hợp lệ');
		}
	} catch (error) {
		next(error);
	}
};
