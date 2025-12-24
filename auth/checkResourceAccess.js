const asyncHandler = require('../utils/asyncHandler');
const { AuthFailureError, NotFoundError, InternalError, ForbiddenError } = require('../AppError');
const ROLES = require('../constants/userRoles');
const Services = require('../service');
const resourceOwnershipPolicy = require('./resourceOwnerShipPolicy');
const resolveResourceId = require('../utils/resolveResourceId');

const checkResourceAccess = (resourceType, permissionKey = null) => {
	return asyncHandler(async (req, res, next) => {
		const { user } = req;
		const resourceId = resolveResourceId(req, resourceType);
		console.log('log of resourceId: ', resourceId);

		const policy = resourceOwnershipPolicy[resourceType];
		if (!policy) throw new InternalError('Resource policy not defined');

		const buildingId = await policy.resolveBuildingId(resourceId);
		if (!buildingId) throw new NotFoundError('Dữ liệu không tồn tại');

		// Owner && Admin full quyền
		if (user.role === ROLES[`OWNER`] || user.role === ROLES[`ADMIN`]) return next();

		const buildingUser = await Services.buildings.findUserInBuilding(user._id, buildingId);

		if (!buildingUser) {
			throw new ForbiddenError('Bạn không có quyền truy cập tài nguyên này');
		}

		if (permissionKey) {
			const permissions = buildingUser.settings || {};
			if (!permissions[permissionKey]) {
				throw new ForbiddenError('Bạn không có quyền thực hiện tác vụ này');
			}
		}

		next();
	});
};

module.exports = checkResourceAccess;
