const BaseQueue = require('../Base/BaseQueue');
const { NOTI_TASK_COMPLETED, NOTI_MANAGER_COLLECT_CASH_INVOICE } = require('../constant/jobNames');

const notiTaskCompleted = new BaseQueue(NOTI_TASK_COMPLETED);

const notiManagerCollectCashInvoice = new BaseQueue(NOTI_MANAGER_COLLECT_CASH_INVOICE);

module.exports = { notiTaskCompleted, notiManagerCollectCashInvoice };
