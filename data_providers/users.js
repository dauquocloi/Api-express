const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const utils = require('../utils/HandleText');
const jwt = require('jsonwebtoken');

exports.getAll = (data, cb) => {
	MongoConnect.Connect(config.database.fullname)
		.then((db) => {
			// do things here
			Entity.UsersEntity.find({}, cb);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.create = (data, cb) => {
	MongoConnect.Connect(config.database.fullname)
		.then((db) => {
			Entity.UsersEntity.create(data, cb);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
		});
};

// lấy user by emai
exports.getEmail = (data, cb) => {
	MongoConnect.Connect(config.database.fullname)
		.then((db) => {
			Entity.UsersEntity.findOne({ email: data.params?.email }).lean().exec(cb);
		})
		.catch((err) => {
			console.log('getEmail error: ' + err);
			cb(err, null);
			console.log('null');
		});
};

// lấy user by email token
exports.getEmailbyToken = (data, cb) => {
	MongoConnect.Connect(config.database.fullname)
		.then((db) => {
			Entity.CustomersEntity.findOne({ email: data }).lean().exec(cb);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.getByRoomId = (data, cb) => {
	MongoConnect.Connect(config.database.fullname)
		.then((db) => {
			// do things here
			Entity.UsersEntity.find({}, cb);
		})
		.catch((err) => {
			console.log('user_Dataprovider_create: ' + err);
			cb(err, null);
			console.log('null');
		});
};

exports.getUserByUserId = (data, cb) => {
	MongoConnect.Connect(config.database.fullname)
		.then((db) => {
			Entity.UsersEntity.findById(data.id).exec();
			cb;
		})
		.catch((err) => {
			cb(err, null);
			console.log('null');
		});
};

exports.getUserByFullName = (data, cb) => {
	MongoConnect.Connect(config.database.fullname).then(async (db) => {
		// let message = await utils.removeVietnameseTones(data.message); // xử lý văn bản
		await Entity.UsersEntity.createIndex({ fullname: 1, phonenumber: 1 });
		Entity.UsersEntity.find({ $text: { $search: 'Anh Le' } }, cb);
	});
};

exports.login = async (data, cb, next, res) => {
	console.log(data);
	try {
		const currentUser = await Entity.UsersEntity.findOne({ phone: data.userName });
		console.log(currentUser);
		if (currentUser != null) {
			let comparePassword = await bcrypt.compare(data.password, currentUser.password);
			if (comparePassword == true) {
				const token = jwt.sign({ userId: currentUser._id, role: currentUser.role }, config.JWT.JWT_SECRET);
				const refreshToken = jwt.sign({ userId: currentUser._id, role: currentUser.role }, config.JWT.JWT_REFRESH, { expiresIn: '60d' });

				currentUser.tokens = currentUser.tokens.filter((token) => token !== data.refreshToken);
				currentUser.tokens.push(refreshToken);
				await currentUser.save();
				console.log('log of currentuser: ', currentUser);

				res.cookie('refreshToken', refreshToken, {
					httpOnly: true,
					secure: false, // Chỉ hoạt động trên HTTPS (bật nếu chạy production)
					sameSite: 'Strict',
					maxAge: 7 * 24 * 60 * 60 * 1000, //(7 ngày)
				});

				const result = { currentUser, token };
				cb(null, result);
			} else {
				throw new Error('Sai mật khẩu !');
			}
		} else {
			next(new Error('user does not exist'));
		}
	} catch (error) {
		next(error);
	}
};

exports.modifyPassword = async (data, cb, next) => {
	try {
		const userId = mongoose.Types.ObjectId(data.userId);

		const userCurrent = await Entity.UsersEntity.findOne({ _id: userId });
		if (userCurrent != null) {
			const comparePassword = await bcrypt.compare(data.passwordCurrent, userCurrent.password);
			if (comparePassword == true) {
				let encryptedPassword = await bcrypt.hash(data.passwordNew, 5);
				userCurrent.password = encryptedPassword;
				await userCurrent.save();
				console.log('Password changed');
				cb(null, 'Password changed');
			} else {
				throw new Error('sai mật khẩu');
			}
		} else {
			throw new Error('Không tìm thấy người dùng');
		}
	} catch (error) {
		next(error);
	}
};

// role owner & admin only
exports.modifyUserInfo = async (data, cb, next) => {
	try {
		const userId = mongoose.Types.ObjectId(data.userId);

		const userCurrent = await Entity.UsersEntity.findOne({ _id: userId });
		// continue here
		if (userCurrent != null) {
			const allowedFields = ['expoPushToken', 'cccd', 'avatar', 'birthdate', 'phone', 'permanentAddress', 'fullName', 'cccdIssueDate'];
			const filteredData = Object.fromEntries(Object.entries(data).filter(([key]) => allowedFields.includes(key)));

			Object.assign(userCurrent, filteredData);
			await userCurrent.save();
			cb(null, userCurrent);
		} else {
			throw new Error('Không tìm thấy tài khoản');
		}
	} catch (error) {
		next(error);
	}
};

// role admin only (this is shit)
// cho trang phân quyền role admin
exports.getAllManagers = async (data, cb, next) => {
	try {
		const ownerId = mongoose.Types.ObjectId(data.userId);

		const managerInfo = await Entity.UsersEntity.aggregate([
			{
				$match: {
					_id: ownerId,
				},
			},
			{
				$lookup: {
					from: 'buildings',
					localField: '_id',
					foreignField: 'management.user',
					as: 'buildingInfo',
				},
			},
			{
				$unwind: {
					path: '$buildingInfo',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$unwind: {
					path: '$buildingInfo.management',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: 'users',
					let: {
						managements: '$buildingInfo.management',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$role', 'manager'],
										},
										{
											$eq: ['$$managements.user', '$_id'],
										},
									],
								},
							},
						},
					],
					as: 'managerInfo',
				},
			},
			{
				$unwind: {
					path: '$managerInfo',
				},
			},
			{
				$project: {
					_id: 1,
					phone: 1,
					fullName: 1,
					role: 1,
					buildingName: '$buildingInfo.buildingName',
					managerInfo: 1,
				},
			},
			{
				$group: {
					_id: {
						ownerId: '$_id',
						_id: '$managerInfo._id',
						avatar: '$managerInfo.avatar',
						expoPushToken: '$managerInfo.expoPushToken',
						phone: '$managerInfo.phone',
						role: '$managerInfo.role',
						birthdate: '$managerInfo.birthdate',
						cccd: '$managerInfo.cccd',
						cccdIssueDate: '$managerInfo.cccdIssueDate',
						fullName: '$managerInfo.fullName',
						permanentAddress: '$managerInfo.permanentAddress',
					},
					buildingManagement: {
						$push: '$buildingName',
					},
				},
			},
			{
				$group: {
					_id: '$_id.ownerId',
					managerInfo: {
						$push: {
							_id: '$_id._id',
							avatar: '$_id.avatar',
							expoPushToken: '$_id.expoPushToken',
							phone: '$_id.phone',
							role: '$_id.role',
							birthdate: '$_id.birthdate',
							cccd: '$_id.cccd',
							cccdIssueDate: '$_id.cccdIssueDate',
							fullName: '$_id.fullName',
							permanentAddress: '$_id.permanentAddress',
							buildingManagement: '$buildingManagement',
						},
					},
				},
			},
		]);

		if (managerInfo.length > 0) {
			cb(null, managerInfo[0].managerInfo);
		} else {
			cb(null, []);
		}
	} catch (error) {
		next(error);
	}
};

exports.createManager = async (data, cb, next) => {
	try {
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);
		let encryptedPassword = await bcrypt.hash(data.phone, 5);

		const userInfo = {
			fullName: data.fullName,
			phone: data.phone,
			username: data.phone,
			cccd: data.cccd ?? null,
			cccdIssueDate: data.cccdIssueDate ?? null,
			permanentAddress: data.permanentAddress ?? null,
			password: encryptedPassword,
			role: 'manager',
			birthdate: data.birthdate ?? null,
		};
		const createNewManager = await Entity.UsersEntity.create(userInfo);
		console.log('log of new manager: ', createNewManager);
		const currentBuilding = await Entity.BuildingsEntity.findOne({ _id: buildingObjectId });
		if (!currentBuilding) {
			throw new Error('BuildingId không tồn tại');
		}
		currentBuilding.management?.push({
			user: createNewManager._id,
			role: 'manager',
		});
		await currentBuilding.save();

		cb(null, 'success');
	} catch (error) {
		next(error);
	}
};

// list chọn manager
exports.getAllManagement = async (data, cb, next) => {
	try {
		const userObjectId = mongoose.Types.ObjectId(data.userId);

		const managements = await Entity.BuildingsEntity.aggregate([
			{
				$match: {
					'management.user': userObjectId,
				},
			},
			{
				$addFields: {
					userQueryId: userObjectId,
				},
			},
			{
				$unwind: {
					path: '$management',
				},
			},
			{
				$group: {
					_id: '$userQueryId',
					listManagementObjectIds: {
						$addToSet: '$management.user',
					},
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'listManagementObjectIds',
					foreignField: '_id',
					pipeline: [
						{
							$project: {
								_id: 1,
								fullName: 1,
								role: 1,
								avatar: 1,
							},
						},
					],
					as: 'listManagements',
				},
			},
		]);
		if (managements.length <= 0) {
			throw new Error('Không có dữ liệu');
		}

		cb(null, { listManagements: managements[0].listManagements });
	} catch (error) {
		next(error);
	}
};

// role owner & admin only
exports.removeManager = async (data, cb, next) => {
	try {
		const managerId = mongoose.Types.ObjectId(data.managerId);
		const currentUser = await Entity.UsersEntity.findOne({ _id: managerId });
		if (currentUser == null) {
			throw new Error('User does not exist');
		}
		currentUser.role = 'guest';
		currentUser.tokens?.filter((token) => token == '');
		await currentUser.save();
		cb(null, currentUser);
	} catch (error) {
		next(error);
	}
};

exports.getRefreshToken = async (req, cb, next) => {
	try {
		const userId = mongoose.Types.ObjectId(req.params?.userId);
		const currentRefreshToken = await Entity.UsersEntity.findOne({ _id: userId }).lean();
		console.log('log of currentRefreshToken: ', currentRefreshToken);
		if (currentRefreshToken == null) {
			throw new Error('user không tồn tại');
		} else {
			cb(null, currentRefreshToken.tokens);
		}
	} catch (error) {
		next(error);
	}
};
