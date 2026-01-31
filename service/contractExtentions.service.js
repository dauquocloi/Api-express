const Entity = require('../models');

exports.createContractExtention = async ({ contractId, roomId, extentionDate, newRent, newDepositAmount, creator }, session) => {
	const [result] = await Entity.ContractExtentionsEntity.create(
		[
			{
				contract: contractId,
				room: roomId,
				extentionDate: extentionDate,
				rent: newRent,
				depositAmount: newDepositAmount,
				creator: creator,
			},
		],
		{ version },
	);
	return result.toObject();
};
