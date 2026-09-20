const mongoose = require('mongoose');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { NotFoundError, BadRequestError, InternalError, ConflictError } = require('../AppError');
const Services = require('../service');
const generateHashPassword = require('../utils/generateHashPassword');

exports.getAll = async () => {
	return await Services.users.getAllUsers();
};

exports.create = async (data) => {
	const { buildingIds, fullName, phone, dob, cccd, cccdIssueDate, cccdIssueAt, permanentAddress, gender, role } = data;

	const user = await Services.users.findUserByPhone(phone).lean().exec();
	if (user) throw new ConflictError('Người dùng đã tồn tại trong hệ thống !');

	const encryptedPassword = await generateHashPassword(phone.trim(), 10);
	const userInfo = {
		fullName: fullName.trim(),
		phone: phone.trim(),
		username: phone.trim(),
		cccd: cccd,
		cccdIssueDate: cccdIssueDate,
		cccdIssueAt: cccdIssueAt.trim(),
		permanentAddress: permanentAddress,
		password: encryptedPassword,
		role: role,
		dob: dob ?? null,
		gender: gender,
	};
	const userCreated = await Services.users.createManagement({ ...userInfo });

	await Services.buildings.addManagement(userCreated._id, buildingIds, userCreated.role);

	return userCreated;
};

// unrefacted
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

exports.modifyManagementInfo = async (payload) => {
	const { userId, buildingIds, fullName, phone, dob, cccd, cccdIssueDate, cccdIssueAt, permanentAddress, gender, role } = payload;

	const buildingObjectIds = buildingIds.map((id) => new mongoose.Types.ObjectId(id));

	const userInfo = {
		fullName: fullName.trim(),
		phone: phone.trim(),
		cccd: cccd,
		cccdIssueDate: cccdIssueDate,
		cccdIssueAt: cccdIssueAt.trim(),
		permanentAddress: permanentAddress,
		role: role,
		dob: dob ?? null,
		gender: gender,
	};
	await Services.users.modifyManagementInfo({ ...userInfo, userId });

	await Services.buildings.pullManagementNotMatchBuilding(buildingObjectIds, userId);

	await Services.buildings.findAndModifyManagement(buildingObjectIds, userId, role);

	throw new InternalError('Stop for testing');
	return 'Success';
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

exports.modifyUserPermission = async (userId, newPermission) => {
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

	return 'Success';
};

exports.checkManagerCollectedCash = async (userId) => {
	const userObjectId = new mongoose.Types.ObjectId(userId);
	const transactions = await Services.transactions.getTransactionsByUserId(userObjectId);
	return transactions;
};

exports.changeUserBuildingManagement = async (data) => {
	const { userId, buildingIds, role } = data;

	// await Promise.all([
	// 	Entity.BuildingsEntity.updateMany(
	// 		{ 'management.user': userObjectId },
	// 		{
	// 			$pull: {
	// 				management: { user: userObjectId },
	// 			},
	// 		},
	// 	),

	// 	Entity.BuildingsEntity.updateMany(
	// 		{ _id: { $in: listBuildingObjectIds } },
	// 		{
	// 			$push: {
	// 				management: {
	// 					user: userObjectId,
	// 					role: data.role,
	// 				},
	// 			},
	// 		},
	// 	),
	// ]);

	await Services.buildings.updateUserBuildingManagement({ buildingIds, userId, role: data.role });
};

exports.addDevice = async (userId, deviceId, platform, expoPushToken) => {
	const currentUser = await Services.users.findById(userId).lean().exec();
	if (!currentUser) throw new NotFoundError('Không tìm thấy người dùng');
	await Services.users.addDevice(userId, deviceId, platform, expoPushToken);
	return 'Success';
};

exports.setNotification = async (userId, type, enabled) => {
	const user = await Services.users.findById(userId).lean().exec();
	if (!user) throw new NotFoundError('Người dùng không tồn tại !');
	const result = await Services.users.setNotificationSetting(userId, type, enabled);
	return {
		[type]: enabled,
	};
};

exports.modifyUserInfo = async (payload) => {
	const { userId, fullName, phone, cccd, cccdIssueDate, cccdIssueAt, permanentAddress, role, dob, gender } = payload;
	const userInfo = {
		fullName: fullName.trim(),
		phone: phone.trim(),
		cccd: cccd,
		cccdIssueDate: cccdIssueDate,
		cccdIssueAt: cccdIssueAt.trim(),
		permanentAddress: permanentAddress,
		role: role,
		dob: dob ?? null,
		gender: gender,
	};
	const result = await Services.users.modifyManagementInfo({ ...userInfo, userId });

	return {
		fullName: result.fullName,
		phone: result.phone,
		CCCD: result.cccd,
		cccdIssueDate: result.cccdIssueDate,
		cccdIssueAt: result.cccdIssueAt,
		address: result.permanentAddress,
		dob: result.birthdate,
		gender: result.gender,
	};
};
