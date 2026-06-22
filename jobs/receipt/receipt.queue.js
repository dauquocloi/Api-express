const BaseQueue = require('../Base/BaseQueue');
const { LOCK_RECEIPT } = require('../constant/jobNames');

const lockReceipt = new BaseQueue(LOCK_RECEIPT);

module.exports = { lockReceipt };
