const { ROLE_PERMISSIONS } = require('../constants/permissions');
const ROLES = require('../constants/userRoles');

const resolvePermissions = ({ role, policies }) => {
	if (role === ROLES.OWNER) {
		return { '*': true };
	}

	const basePermissions = ROLE_PERMISSIONS[role] || [];

	const resolved = {};

	for (const permission of basePermissions) {
		resolved[permission] = true;
	}

	for (const permission in policies) {
		resolved[permission] = policies[permission];
	}

	return resolved;
};

module.exports = resolvePermissions;
