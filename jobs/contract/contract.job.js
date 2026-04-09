const contractQueue = require('./contract.queue');

const generateContractJob = async (data) => {
	return contractQueue.enqueue(data);
};

module.exports = { generateContractJob };
