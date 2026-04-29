const { generateContractQueue } = require('./contract.queue');

const generateContractJob = async (data) => {
	return generateContractQueue.enqueue(data);
};

module.exports = { generateContractJob };
