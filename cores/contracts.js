var DataProvider = require('../data_providers/contracts');
const { generateContractQueue } = require('../queues');

exports.getAll = (data, cb) => {
	DataProvider.getAll(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, result);
		}
	});
};

exports.create = (data, cb) => {
	DataProvider.create(data, cb);
};

exports.updateOne = (data, cb) => {
	DataProvider.updateOne(data, cb);
};

exports.generateContract = (data, cb, next) => {
	DataProvider.generateContract(
		data,
		(error, result) => {
			if (error) {
				return cb(error, null);
			}

			generateContractQueue.add({
				buildingId: result.buildingId,
				roomId: result.roomId,
				contractId: result.contractId,
				contractSignDate: result.contractSignDate,
				contractEndDate: result.contractEndDate,
				contractTerm: result.contractTerm,
				depositAmount: result.depositAmount,
				rent: result.rent,
				feesData: result.feesData,
				interiors: result.interiors ?? [],
			});
			cb(null, result);
		},
		next,
	);
};

exports.getContractPdfSignedUrl = (data, cb, next) => {
	DataProvider.getContractPdfSignedUrl(data, cb, next);
};

exports.setExpectedMoveOutDate = (data, cb, next) => {
	DataProvider.setExpectedMoveOutDate(data, cb, next);
};

exports.cancelIsEarlyTermination = (data, cb, next) => {
	DataProvider.cancelIsEarlyTermination(data, cb, next);
};

exports.terminateContractUnRefund = (data, cb, next) => {
	DataProvider.terminateContractUnRefund(data, cb, next);
};
