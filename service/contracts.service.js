const { NotFoundError } = require('../AppError');
const Entity = require('../models');
const { withSignedUrls } = require('../utils/withSignedUrls');
const { generateContractCode } = require('../utils/generateContractCode');

exports.getContractPdfUrl = async (contractCode) => {
	const currentContract = await Entity.ContractsEntity.findOne({ contractCode: contractCode });
	if (!currentContract) throw new NotFoundError('Hợp đồng không tồn tại');
	const contractPdfUrl = await withSignedUrls(currentContract, 'contractPdfUrl');

	return contractPdfUrl.contractPdfUrl;
};

exports.getContractById = async (contractId, session) => {
	const query = Entity.ContractsEntity.findById(contractId);
	if (session) query.session(session);
	const contractInfo = await query;
	if (!contractInfo) throw new NotFoundError('Hợp đồng không tồn tại');
	return contractInfo;
};

exports.generateContract = async (
	{
		rent,
		roomFees,
		contractSignDate,
		contractEndDate,
		contractTerm,

		roomId,
		depositReceiptId,
		depositId,
	},
	session,
) => {
	const contractCode = await generateContractCode(process.env.CONTRACT_CODE_LENGTH);
	const [createContract] = await Entity.ContractsEntity.create(
		[
			{
				createdAt: new Date(),
				rent: rent,
				fees: roomFees,
				contractSignDate: contractSignDate,
				contractEndDate: contractEndDate,
				contractTerm: contractTerm,
				status: 'active',
				room: roomId,
				contractCode: contractCode,
				depositReceiptId: depositReceiptId,
				depositId: depositId ?? null,
			},
		],
		{ session },
	);
	return createContract;
};
