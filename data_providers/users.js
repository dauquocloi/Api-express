const mongoose = require('mongoose');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { NotFoundError, BadRequestError } = require('../AppError');
const Services = require('../service');
const redis = require('../config/redisClient');

exports.getAll = async () => {
	return await Services.users.getAllUsers();
};

exports.create = async (data, redisKey) => {
	let session;
	try {
		const user = await Services.users.findUserByPhone(data.phone);
		if (user) throw new BadRequestError('User already registered');

		const { buildingIds } = data;
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const encryptedPassword = await bcrypt.hash(data.phone.trim(), 5);
			const userInfo = {
				fullName: data.fullName.trim(),
				phone: data.phone.trim(),
				username: data.phone.trim(),
				cccd: data.cccd,
				cccdIssueDate: data.cccdIssueDate,
				cccdIssueAt: data.cccdIssueAt.trim(),
				permanentAddress: data.permanentAddress,
				password: encryptedPassword,
				role: data.role,
				dob: data.dob ?? null,
				gender: data.gender,
			};
			const userCreated = await Services.users.createManagement({ ...userInfo }, session);
			const notificationSettingCreated = await Services.notifications.createNotificationSetting(userCreated._id, session);
			await Services.users.setNotificationSetting(userCreated._id, notificationSettingCreated._id, session);
			console.log('log of notificationSettingCreated: ', notificationSettingCreated);

			const pushUserCreated = await Services.buildings.addManagement(userCreated._id, buildingIds, userCreated.role, session);

			throw new BadRequestError('stop for testing');
			return 'Success';
		});

		await redis.set(redisKey, `SUCCESS:${JSON.stringify({})}`, 'EX', process.env.REDIS_EXP_SEC);
		return 'Success';
	} catch (error) {
		throw error;
	} finally {
		if (session) {
			session.endSession();
		}
	}
};

exports.modifyPassword = async (data, cb, next) => {
	try {
		const userId = new mongoose.Types.ObjectId(data.userId);

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

exports.modifyManagementInfo = async (payload, userId, redisKey) => {
	const user = await Services.users.findById(userId);
	if (!user) throw new NotFoundError('Người dùng không tồn tại!');

	let session;
	try {
		const { buildingIds } = payload;
		const buildingObjectIds = buildingIds.map((id) => new mongoose.Types.ObjectId(id));
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const userInfo = {
				fullName: payload.fullName.trim(),
				phone: payload.phone.trim(),
				cccd: payload.cccd,
				cccdIssueDate: payload.cccdIssueDate,
				cccdIssueAt: payload.cccdIssueAt.trim(),
				permanentAddress: payload.permanentAddress,
				role: payload.role,
				dob: payload.dob ?? null,
				gender: payload.gender,
			};
			await Services.users.modifyManagementInfo({ ...userInfo }, user._id, session);

			await Services.buildings.pullManagementNotMatchBuilding(buildingObjectIds, user._id, session);

			await Services.buildings.findAndModifyManagement(buildingObjectIds, user._id, payload.role, session);

			// throw new BadRequestError('stop for testing');
			return 'Success';
		});

		await redis.set(redisKey, `SUCCESS:${JSON.stringify({})}`, 'EX', process.env.REDIS_EXP_SEC);
		return 'Success';
	} catch (error) {
		await redis.set(redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		if (session) {
			session.endSession();
		}
	}
};

// role admin only (this is shit)
// cho trang phân quyền role admin
// Lấy tất cả các quản trị viên, nhân viên
exports.getAllManagers = async (userId) => {
	const ownerId = new mongoose.Types.ObjectId(userId);
	const managerInfo = await Services.users.getAllManagements(ownerId);
	return managerInfo;
};

// list chọn manager
exports.getListSelectionManagements = async (userId) => {
	const userObjectId = new mongoose.Types.ObjectId(userId);
	const listManagements = await Services.users.getListSelectionManagements(userObjectId);
	return listManagements;
};

// role owner & admin only
exports.removeManager = async (managerId) => {
	const currentUser = await Entity.UsersEntity.findOne({ _id: managerId });
	if (currentUser == null) {
		throw new NotFoundError('Không tìm thấy người dùng');
	}
	currentUser.role = 'guest';
	currentUser.tokens?.filter((token) => token == '');
	await currentUser.save();
	return 'Success';
};

exports.modifyUserPermission = async (userId, newPermission, redisKey) => {
	const modifyUserRoleInBuildings = await Entity.BuildingsEntity.findOneAndUpdate(
		{ 'management.user': userId },
		{
			$set: {
				'management.$.role': newPermission,
			},
		},
		{ new: true },
	);

	if (!modifyUserRoleInBuildings) throw new NotFoundError('Người dùng không tồn tại!');
	const modifyUserPermission = await Entity.UsersEntity.findOneAndUpdate({ _id: userId }, { role: newPermission }, { new: true });
	if (!modifyUserPermission) throw new NotFoundError('Người dùng không tồn tại trong hệ thống!');

	await redis.set(redisKey, `SUCCESS:${JSON.stringify({})}`, 'EX', process.env.REDIS_EXP_SEC);
	return 'Success';
};

exports.checkManagerCollectedCash = async (userId) => {
	const userObjectId = new mongoose.Types.ObjectId(userId);
	const transactions = await Services.transactions.getTransactionsByUserId(userObjectId);
	return transactions;
};

exports.changeUserBuildingManagement = async (data, redisKey) => {
	let session;
	try {
		const userObjectId = new mongoose.Types.ObjectId(data.userId);
		const listBuildingObjectIds = data.buildingIds.map((b) => new mongoose.Types.ObjectId(b));
		session = await mongoose.startSession();
		session.startTransaction();

		await Promise.all([
			Entity.BuildingsEntity.updateMany(
				{ 'management.user': userObjectId },
				{
					$pull: {
						management: { user: userObjectId },
					},
				},
				{ session },
			),

			Entity.BuildingsEntity.updateMany(
				{ _id: { $in: listBuildingObjectIds } },
				{
					$push: {
						management: {
							user: userObjectId,
							role: data.role,
						},
					},
				},
				{ session },
			),
		]);

		await session.commitTransaction();

		await redis.set(redisKey, `SUCCESS:${JSON.stringify({})}`, 'EX', process.env.REDIS_EXP_SEC);
		return 'Success';
	} catch (error) {
		if (session) await session.abortTransaction();
		await redis.set(redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.addDevice = async (userId, deviceId, platform, expoPushToken, redisKey) => {
	const currentUser = await Services.users.findById(userId).lean().exec();
	if (!currentUser) throw new NotFoundError('Không tìm thấy người dùng');
	await Services.users.addDevice(userId, deviceId, platform, expoPushToken);
	await redis.set(redisKey, `SUCCESS:${JSON.stringify({})}`, 'EX', process.env.REDIS_EXP_SEC);
	return 'Success';
};
