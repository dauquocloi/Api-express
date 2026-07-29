const { NotFoundError, InternalError } = require('../AppError');
const Entity = require('../models');
const withSignedUrls = require('../utils/withSignedUrls');
const generateContractCode = require('../utils/generateContractCode');
const { contractStatus } = require('../constants/contracts');
const Pipelines = require('./aggregates');
const getFileUrl = require('../utils/getFileUrl');
const deepMutate = require('../utils/deepMutate');

exports.findById = (contractId) => {
	return Entity.ContractsEntity.findById(contractId);
};

exports.findByRoomId = (roomId) => {
	return Entity.ContractsEntity.findOne({ room: roomId, status: contractStatus['ACTIVE'] });
};

exports.findByContractCode = (contractCode) => Entity.ContractsEntity.findOne({ 'versions.contractCode': contractCode });

exports.findContractNearExpi = (targetDate) =>
	Entity.ContractsEntity.find(
		{
			versions: {
				$elemMatch: {
					contractEndDate: {
						$gte: targetDate,
					},
					status: contractStatus.ACTIVE,
				},
			},
		},
		{
			versions: {
				$elemMatch: {
					contractEndDate: {
						$gte: targetDate,
					},
					status: contractStatus.ACTIVE,
				},
			},
		},
	);

exports.findByCustomerId = (customerId) => Entity.ContractsEntity.findOne({ customer: customerId });

exports.importCustomerRef = async (contractId, customerId, session) => {
	const result = await Entity.ContractsEntity.updateOne({ _id: contractId }, { $set: { customer: customerId } }, { session: session });
	if (result.matchedCount === 0) throw new NotFoundError('Hợp đồng không tồn tại');
	return result;
};

exports.getContractPdfUrl = async (contractCode) => {
	const currentContract = await Entity.ContractsEntity.findOne(
		{ 'versions.contractCode': contractCode },
		{
			versions: {
				$elemMatch: { contractCode },
			},
		},
	);

	if (!currentContract) throw new NotFoundError('Không tìm thấy dữ liệu !');
	if (!currentContract.versions?.[0]?.contractPdfUrl) return null;

	const contractPdfUrl = await getFileUrl(currentContract.versions[0].contractPdfUrl);

	return contractPdfUrl;
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
				status: contractStatus['ACTIVE'],
				room: roomId,
				contractCode: contractCode,
				depositReceiptId: depositReceiptId,
				depositId: depositId ?? null,
				depositAmount: depositAmount,
				versions: [
					{
						version: 0,
						rent: rent,
						depositAmount: depositAmount,
						contractSingDate: contractSignDate,
						contractEndDate: contractEndDate,
						contractPdfUrl: null,
						contractPdfFile: null,
						createdAt: new Date(),
						updatedAt: new Date(),
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
	const result = await Entity.ContractsEntity.updateOne(
		{ _id: contractId, 'versions.status': contractStatus['ACTIVE'] },
		{
			$set: {
				status: contractStatus['EXPIRED'],
				'versions.$.status': contractStatus['EXPIRED'],
				'versions.$.updatedAt': new Date(),
			},
			$inc: { version: 1 },
		},
		{ session },
	);
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
			'versions.status': contractStatus['ACTIVE'],
		},
		{
			$set: {
				'versions.$.contractEndDate': newContractEndDate,
				'versions.$.rent': newRent,
				'versions.$.updatedAt': new Date(),
			},
			$inc: { version: 1 },
		},
		{ session },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Hợp đồng không tồn tại');
	return true;
};

// Nên truyền version của versions làm tham số !
exports.clientConfirmContract = async (contractId, session) => {
	const result = await Entity.ContractsEntity.updateOne(
		{ _id: contractId, 'versions.customerConfirmed': false },
		{
			$set: {
				'versions.$.customerConfirmed': true,
				'versions.$.status': contractStatus['ACTIVE'],
			},
			$inc: { version: 1 },
		},
		{ session },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Hợp đồng không tồn tại');
	return true;
};

exports.getDebtsAndReceiptsUnpaid = async (contractId, session) => {
	const [result] = await Entity.ContractsEntity.aggregate(Pipelines.contracts.getDebtsAndReceiptsUnpaid(contractId)).session(session);
	if (!result) throw new NotFoundError('Hợp đồng không tồn tại');
	return result;
};

exports.setContractOwner = async ({ currentCustomerId, customerId }, session = null) => {
	const result = await Entity.ContractsEntity.updateOne(
		{ customer: currentCustomerId },
		{ $set: { customer: customerId }, $inc: { version: 1 } },
		{ session },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Hợp đồng không tồn tại');
	return true;
};
