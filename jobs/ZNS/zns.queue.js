const BaseQueue = require('../Base/BaseQueue');
const { ZNS_NEW_INVOICE_NOTI } = require('../constant/jobNames');

const znsNewInvoiceNotiQueue = new BaseQueue(ZNS_NEW_INVOICE_NOTI);

module.exports = { znsNewInvoiceNotiQueue };
