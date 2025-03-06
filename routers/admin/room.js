const UseCase = require('../../cores/admin/room');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');
const fs = require('fs');
const XLSX = require('xlsx');

exports.addManyRooms = (req, res, next) => {
	try {
		if (!req.file) {
			return res.status(400).json({ message: 'Vui lòng chọn một file Excel!' });
		}

		// let data = req.file.path;
		const buildingInfo = {
			buildingName: req.body?.buildingName,
			buildingAddress: req.body?.buildingAddress,
			buildingName: req.body?.buildingName,
			roomQuantity: req.body?.roomQuantity,
			ownerName: req.body?.ownerName,
			ownerPhone: req.body?.ownerPhone,
		};
		let data = {
			buildingInfo,
			roomFile: req.file.path,
		};
		console.log(buildingInfo);

		UseCase.addManyRooms(data, (err, result) => {
			if (err) {
				return res.status(204).send({
					errorCode: 0,
					data: {},
					message: 'created fail',
					errors: [],
				});
			} else {
				return res.status(201).send({
					errorCode: 0,
					data: result,
					message: 'succesfull created',
					errors: [],
				});
			}
		});
	} catch (error) {
		return res.status(500).json({ message: 'Lỗi xử lý file!', error: error.message });
	}
};
