const { NotFoundError } = require('../AppError');
const Entity = require('../models');
const { withSignedUrls } = require('../utils/withSignedUrls');
const generateContractCode = require('../utils/generateContractCode');

exports.findById = (contractId) => {
	return Entity.ContractsEntity.findById(contractId);
};

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

exports.createContractDraft = async (
	{
		room,
		rent,
		depositAmount,
		depositId = null,
		depositReceiptId,
		firstInvoiceId,

		interiors,
		fees,
		customers,
		contractSignDate,
		contractEndDate,
		contractTerm,
		note,
	},
	session,
) => {
	const [contractDraft] = await Entity.ContractDraftsEntity.create(
		[
			{
				room,
				rent,
				depositAmount,
				interiors,
				fees,
				customers,
				contractSignDate,
				contractEndDate,
				contractTerm,
				depositId,
				firstInvoiceId,
				depositReceiptId,
				note,
			},
		],
		session,
	);

	return contractDraft;
};

exports.getContractDraftById = async (contractDraftId, session) => {
	const result = await Entity.ContractDraftsEntity.findById(contractDraftId).session(session).lean().exec();
	if (!result) throw new NotFoundError('Dữ liệu không tồn tại!');
	return result;
};
