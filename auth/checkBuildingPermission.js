const ROLES = require('../constants/userRoles');
const Services = require('../service');
const asyncHandler = require('../utils/asyncHandler');
const { AuthFailureError, ForbiddenError } = require('../AppError');

const checkBuildingPermission = (permissionKey) =>
	asyncHandler(async (req, res, next) => {
		const { user } = req;

		// Owner bypass toàn bộ
		if (user.role === ROLES['OWNER'] || user.role === ROLES['ADMIN']) return next();

		const buildingId = req.params.buildingId || req.body.buildingId;
		if (!buildingId) throw new AuthFailureError('Building context required');

		const buildingUser = await Services.buildings.findUserInBuilding({
			userId: user._id,
			buildingId,
		});

		if (!buildingUser) throw new AuthFailureError('User not belong to building');

		const permissions = buildingUser.settings || {};

		if (!permissions[permissionKey]) {
			throw new ForbiddenError('Bạn không có quyền thực hiện tác vụ này');
		}

		next();
	});

module.exports = checkBuildingPermission;
