const BaseQueue = require('../Base/BaseQueue');
const { GENERATE_CONTRACT_QUEUE } = require('../constant/jobNames');

const generateContractQueue = new BaseQueue(GENERATE_CONTRACT_QUEUE);

module.exports = { generateContractQueue };
