const BaseQueue = require('../Base/BaseQueue');
const { CONTRACT_QUEUE } = require('../constant/jobNames');

const contractQueue = new BaseQueue(CONTRACT_QUEUE);

module.exports = { contractQueue };
