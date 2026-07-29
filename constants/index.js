const invoices = require('./invoices');
const receipt = require('./receipt');
const customers = require('./customers');
const contracts = require('./contracts');
const debts = require('./debts');
const vehicles = require('./vehicle');
const deposits = require('./deposits');
const rooms = require('./rooms');
const fees = require('./fees');

module.exports = { ...invoices, ...receipt, ...customers, ...contracts, ...debts, ...vehicles, ...deposits, ...rooms, ...fees };
