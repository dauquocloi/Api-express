const BaseQueue = require('../Base/BaseQueue');
const { LOCK_INVOICE } = require('../constant/jobNames');

const lockInvoice = new BaseQueue(LOCK_INVOICE);

module.exports = { lockInvoice };
