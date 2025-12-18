const express = require('express');
const { SuccessMsgResponse } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../helpers/asyncHandler');
const authentication = require('../../auth/authentication');
const Entity = require('../../models');

const router = express.Router();

/*-------------------------------------------------------------------------*/
router.use(authentication);
/*-------------------------------------------------------------------------*/

router.delete(
	'/',
	asyncHandler(async (req, res) => {
		await Entity.KeyStoresEntity.remove(req.keystore._id);
		return new SuccessMsgResponse('Logout success').send(res);
	}),
);

export default router;
