const express = require('express');
const { SuccessMsgResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const authentication = require('../../auth/authentication');
const Services = require('../../service');

const router = express.Router();

/*-------------------------------------------------------------------------*/
router.use(authentication);
/*-------------------------------------------------------------------------*/

router.delete(
	'/',
	asyncHandler(async (req, res) => {
		console.log('logout ', req.keyStore);
		await Services.keyStores.remove(req.keyStore._id);
		return new SuccessMsgResponse('Logout success').send(res);
	}),
);

module.exports = router;
