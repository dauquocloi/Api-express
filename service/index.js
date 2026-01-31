const fees = require('./fees.service');
const debts = require('./debts.service');
const invoices = require('./invoices.service');
const receipts = require('./receipts.service');
const checkoutCosts = require('./checkoutCost/checkoutCosts.services');
const customers = require('./customers.service');
const users = require('./users.service');
const keyStores = require('./keyStores.service');
const buildings = require('./buildings.service');
const rooms = require('./rooms.service');
const depositRefunds = require('./depositRefunds.service');
const deposits = require('./deposits.service');
const notifications = require('./notifications.service');
const transactions = require('./transactions.service');
const tasks = require('./tasks.service');
const vehicles = require('./vehicles.service');
const contracts = require('./contracts.service');
const bankAccounts = require('./bankAccounts.service');
const sepays = require('./sepays.service');
const statistics = require('./statistics.service');
const expenditures = require('./expenditures.service');
const revenues = require('./revenues.service');
const banks = require('./banks.service');
const contractExtentions = require('./contractExtentions.service');
const otps = require('./otps.service');

module.exports = {
	buildings,
	banks,
	customers,
	contracts,
	contractExtentions,
	checkoutCosts,
	debts,
	deposits,
	depositRefunds,
	fees,
	invoices,
	keyStores,
	notifications,
	receipts,
	rooms,
	transactions,
	tasks,
	users,
	vehicles,
	bankAccounts,
	sepays,
	statistics,
	expenditures,
	revenues,
	otps,
};
