const invoices = require('./invoices');
const receipt = require('./receipt');
const customers = require('./customers');

module.exports = { ...invoices, ...receipt, ...customers };
