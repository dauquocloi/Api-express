const { NotFoundError, InternalError } = require('../AppError');
const Entity = require('../models');
const { withSignedUrls } = require('../utils/withSignedUrls');
const generateContractCode = require('../utils/generateContractCode');
const { contractStatus } = require('../constants/contracts');
const dayjs = require('dayjs');

exports.findById = (contractId) => {
	return Entity.ContractsEntity.findById(contractId);
};

exports.findByRoomId = (roomId) => {
	return Entity.ContractsEntity.findOne({ room: roomId, status: 'active' });
};

exports.findByContractCode = (contractCode) => Entity.ContractsEntity.findOne({ contractCode: contractCode });

exports.findContractNearExpi = (targetDate) => {
	return Entity.ContractsEntity.find({
		contractEndDate: {
			$gte: targetDate,
			// $lt: dayjs(targetDate).add(1, 'day').toDate(),
		},
		status: contractStatus['ACTIVE'],
	});
};

exports.findByCustomerId = (customerId) => Entity.ContractsEntity.find({ customer: customerId });

exports.importCustomerRef = async (contractId, customerId, session) => {
	const result = await Entity.ContractsEntity.updateOne({ _id: contractId }, { $set: { customer: customerId } }, { session: session });
	if (result.matchedCount === 0) throw new NotFoundError('Hợp đồng không tồn tại');
	return result;
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
		depositAmount,
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
				depositAmount: depositAmount,
				versions: [
					{
						version: 1,
						rent: rent,
						depositAmount: depositAmount,
						contractSingDate: contractSignDate,
						contractEndDate: contractEndDate,
						contractPdfUrl: null,
						contractPdfFile: null,
						createdAt: new Date(),
						customerConfirmed: false,
						status: contractStatus['PENDING'],
					},
				],
			},
		],
		{ session },
	);
	if (!createContract) throw new InternalError('Có lỗi trong quá trình tạo hợp đồng');
	return createContract.toObject();
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

exports.expiredContract = async (contractId, session) => {
	const result = await Entity.ContractsEntity.updateOne({ _id: contractId }, { $set: { status: contractStatus['EXPIRED'] } }, { session });
	if (result.matchedCount === 0) throw new NotFoundError('Hợp đồng không tồn tại');
	return result;
};

exports.importContracts = async (contractsData, session) => {
	const result = await Entity.ContractsEntity.insertMany(contractsData, { session });
	return result;
};

exports.importContractPdfUrlAndContractFile = async (contractId, contractPdfUrl, contractFile) => {
	const result = await Entity.ContractsEntity.findOneAndUpdate(
		{ _id: contractId },
		{
			$set: {
				contractPdfUrl: contractPdfUrl,
				contractPdfFile: contractFile,
				'versions.0.contractPdfUrl': contractPdfUrl,
				'versions.0.contractPdfFile': contractFile,
			},
		},
		{ new: true },
	);
	if (!result) throw new NotFoundError('Hợp đồng không tồn tại');
	return result.toObject();
};

exports.importManyCustomerRef = async (ownerByContract, session) => {
	const bulkOps = [];

	ownerByContract.forEach((ownerId, contractId) => {
		bulkOps.push({
			updateOne: {
				filter: { _id: contractId },
				update: {
					$set: { customer: ownerId },
				},
			},
		});
	});

	const result = await Entity.ContractsEntity.bulkWrite(bulkOps, { session });
	if (result.matchedCount !== ownerByContract.size) throw new NotFoundError('Hợp đồng không tồn tại');
	return true;
};

exports.contractExtention = async ({ contractId, newContractEndDate, newRent, version }, session) => {
	const result = await Entity.ContractsEntity.updateOne(
		{
			_id: contractId,
			version: version,
		},
		{
			$set: { contractEndDate: newContractEndDate, rent: newRent },
			$inc: { version: 1 },
		},
		{ session },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Hợp đồng không tồn tại');
	return true;
};

exports.clientConfirmContract = async (contractId) => {
	const result = await Entity.ContractsEntity.updateOne(
		{ _id: contractId, 'versions.customerConfirmed': false },
		{ $set: { 'versions.$.customerConfirmed': true, 'versions.$.status': contractStatus['ACTIVE'] } },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Hợp đồng không tồn tại');
	return true;
};
