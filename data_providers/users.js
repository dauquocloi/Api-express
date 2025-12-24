const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const { NotFoundError } = require('../AppError');
const Services = require('../service');

exports.getAll = async () => {
	return await Services.users.getAllUsers();
};

exports.create = (data) => {
	return;
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

// un refacted
exports.modifyUserInfo = async (data) => {
	const userId = mongoose.Types.ObjectId(data.userId);

	const userCurrent = await Entity.UsersEntity.findOne({ _id: userId });
	// continue here
	if (userCurrent != null) {
		const allowedFields = ['expoPushToken', 'cccd', 'avatar', 'birthdate', 'phone', 'permanentAddress', 'fullName', 'cccdIssueDate'];
		const filteredData = Object.fromEntries(Object.entries(data).filter(([key]) => allowedFields.includes(key)));

		Object.assign(userCurrent, filteredData);
		await userCurrent.save();
		return userCurrent;
	} else {
		throw new NotFoundError('Không tìm thấy tài khoản');
	}
};

// role admin only (this is shit)
// cho trang phân quyền role admin
// Lấy tất cả các quản trị viên, nhân viên
exports.getAllManagers = async (userId) => {
	const ownerId = mongoose.Types.ObjectId(userId);
	const managerInfo = await Services.users.getAllManagements(ownerId);
	return managerInfo;
};

exports.createManager = async (data) => {
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

	return 'Success';
};

// list chọn manager
exports.getListSelectionManagements = async (userId) => {
	const userObjectId = mongoose.Types.ObjectId(userId);
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

// exports.getRefreshToken = async (req, cb, next) => {
// 	try {
// 		const userId = mongoose.Types.ObjectId(req.params?.userId);
// 		const currentRefreshToken = await Entity.UsersEntity.findOne({ _id: userId }).lean();
// 		console.log('log of currentRefreshToken: ', currentRefreshToken);
// 		if (currentRefreshToken == null) {
// 			throw new Error('user không tồn tại');
// 		} else {
// 			cb(null, currentRefreshToken.tokens);
// 		}
// 	} catch (error) {
// 		next(error);
// 	}
// };

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
	const userObjectId = mongoose.Types.ObjectId(userId);
	const transactions = await Services.transactions.getTransactionsByUserId(userObjectId);
	return transactions;
};

exports.changeUserBuildingManagement = async (data) => {
	let session;
	try {
		const userObjectId = mongoose.Types.ObjectId(data.userId);
		const listBuildingObjectIds = data.buildingIds.map((b) => mongoose.Types.ObjectId(b));
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

		return 'Success';
	} catch (error) {
		if (session) await session.abortTransaction();
		throw error;
	} finally {
		if (session) session.endSession();
	}
};
