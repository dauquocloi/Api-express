const { contractQueue } = require('./contract.queue');

const contractJob = async (data) => {
	return contractQueue.enqueue(data);
};

module.exports = { contractJob };
