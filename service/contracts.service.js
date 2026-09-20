const { NotFoundError, InternalError, ConflictError } = require('../AppError');
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

exports.findByRoomId = (roomId) => Entity.ContractsEntity.findOne({ room: roomId, status: contractStatus['ACTIVE'] });

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

exports.importCustomerRef = async (contractId, customerId) => {
	const result = await Entity.ContractsEntity.updateOne({ _id: contractId }, { $set: { customer: customerId } });
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

exports.generateContract = async ({
	rent,
	roomFees,
	contractSignDate,
	contractEndDate,
	contractTerm,

	roomId,
	depositReceiptId,
	depositId,
	depositAmount,
}) => {
	const contractCode = await generateContractCode(process.env.CONTRACT_CODE_LENGTH);
	const createContract = await Entity.ContractsEntity.create({
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
				fees: roomFees,
			},
		],
	});
	if (!createContract) throw new InternalError('Có lỗi trong quá trình tạo hợp đồng');
	return createContract.toObject();
};

exports.createContractDraft = async ({
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
}) => {
	const contractDraft = await Entity.ContractDraftsEntity.create({
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
	});
	if (!contractDraft) throw new InternalError('Có lỗi trong quá trình tạo hợp đồng mới !');
	return contractDraft;
};

exports.getContractDraftById = (contractDraftId) => Entity.ContractDraftsEntity.findById(contractDraftId);

exports.expiredContract = async (contractId) => {
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
	);
	if (result.matchedCount === 0) throw new NotFoundError('Hợp đồng không tồn tại');
	return result;
};

exports.importContracts = async (contractsData) => {
	const result = await Entity.ContractsEntity.insertMany(contractsData);
	return result;
};

exports.importContractPdfUrlAndContractFile = async (contractId, contractPdfUrl, contractFile) => {
	const result = await Entity.ContractsEntity.findOneAndUpdate(
		{ _id: contractId, 'versions.status': contractStatus['ACTIVE'] },
		{
			$set: {
				contractPdfUrl: contractPdfUrl,
				contractPdfFile: contractFile,
				'versions.$.contractPdfUrl': contractPdfUrl,
				'versions.$.contractPdfFile': contractFile,
			},
			$inc: { version: 1 },
		},
		{ new: true },
	);
	if (!result) throw new NotFoundError('Hợp đồng không tồn tại');
	return result.toObject();
};

exports.importManyCustomerRef = async (ownerByContract) => {
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

	const result = await Entity.ContractsEntity.bulkWrite(bulkOps);
	if (result.matchedCount !== ownerByContract.size) throw new NotFoundError('Hợp đồng không tồn tại');
	return true;
};

exports.contractExtention = async ({ contractId, newContractEndDate, newContractSignDate, newRent, version, depositAmount, contractTerm }) => {
	const currentContract = await Entity.ContractsEntity.findById(contractId).lean().exec();
	if (!currentContract) throw new NotFoundError('Hợp đồng không tồn tại');
	const latestContractVersion = currentContract.versions.reduce((sum, v) => (v.version > sum.version ? v : sum));
	const fees = await Entity.FeesEntity.find({ room: currentContract.room }).lean().exec();

	const result = await Entity.ContractsEntity.updateOne(
		{
			_id: contractId,
			version: version,
			'versions.status': contractStatus['ACTIVE'],
		},
		{
			$set: {
				'versions.$.updatedAt': new Date(),
				'versions.$.status': contractStatus['EXPIRED'],
			},
			$push: {
				versions: {
					version: latestContractVersion.version + 1,
					contractSignDate: newContractSignDate,
					contractEndDate: newContractEndDate,
					rent: newRent,
					updatedAt: new Date(),
					createdAt: new Date(),
					depositAmount: depositAmount,
					status: contractStatus['ACTIVE'],
					contractCode: await generateContractCode(process.env.CONTRACT_CODE_LENGTH),
					contractTerm: contractTerm,
					fees: fees.map((fee) => ({
						feeName: fee.feeName,
						feeAmount: fee.feeAmount,
						unit: fee.unit,
						feeKey: fee.feeKey,
						iconPath: fee.iconPath ?? '',
					})),
				},
			},
			$inc: { version: 1 },
		},
	);
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu đã cũ, vui lòng tải lại trang');
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

// used for: depositRefund/terminateContractEarly
exports.getDebtsAndReceiptsUnpaid = async (contractId, usedFor) => {
	const [result] = await Entity.ContractsEntity.aggregate(Pipelines.contracts.getDebtsAndReceiptsUnpaid(contractId, usedFor));
	if (!result) throw new NotFoundError('Hợp đồng không tồn tại');
	return result;
};

exports.setContractOwner = async ({ currentCustomerId, customerId }) => {
	const result = await Entity.ContractsEntity.updateOne({ customer: currentCustomerId }, { $set: { customer: customerId }, $inc: { version: 1 } });
	if (result.matchedCount === 0) throw new NotFoundError('Hợp đồng không tồn tại');
	return true;
};

exports.modifyContractVersion = async ({
	contractId,
	rent,
	depositAmount,
	contractSignDate,
	contractEndDate,
	contractTerm,
	fees,
	status = contractStatus['ACTIVE'],
	currentVersionNumber,
}) => {
	const contractCode = await generateContractCode(process.env.CONTRACT_CODE_LENGTH);

	const now = new Date();

	const result = await Entity.ContractsEntity.findOneAndUpdate(
		{
			_id: contractId,
			'versions.status': contractStatus.ACTIVE,
		},
		[
			{
				$set: {
					versions: {
						$concatArrays: [
							{
								$map: {
									input: '$versions',
									as: 'v',
									in: {
										$cond: [
											{
												$eq: ['$$v.status', contractStatus.ACTIVE],
											},
											{
												$mergeObjects: [
													'$$v',
													{
														status: contractStatus.EXPIRED,
														updatedAt: now,
													},
												],
											},
											'$$v',
										],
									},
								},
							},
							[
								{
									version: currentVersionNumber + 1,
									rent,
									depositAmount,
									contractSignDate,
									contractEndDate,
									contractTerm,
									customerConfirmed: true,
									status,
									createdAt: now,
									updatedAt: now,
									contractCode,
									fees,
								},
							],
						],
					},

					version: {
						$add: ['$version', 1],
					},
				},
			},
		],
		{
			new: true,
			updatePipeline: true,
		},
	);
	if (!result) {
		throw new NotFoundError('Hợp đồng không tồn tại !');
	}

	return result;
};

exports.cancelEarlyTermination = async ({ contractId }) => {
	const result = await Entity.ContractsEntity.findOneAndUpdate(
		{
			_id: contractId,
		},
		{
			$set: {
				isEarlyTermination: false,
				expectedMoveOutDate: null,
			},
		},
		{ new: true },
	);
	if (!result) throw new NotFoundError(`Hợp đồng với không tồn tại`);
};
