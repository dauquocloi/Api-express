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
const notifications = require('./notifications.service');
const transactions = require('./transactions.service');
const tasks = require('./tasks.service');
const vehicles = require('./vehicles.service');
const contracts = require('./contracts.service');
module.exports = {
	customers,
	contracts,
	checkoutCosts,
	debts,
	fees,
	receipts,
	users,
	invoices,
	keyStores,
	buildings,
	rooms,
	depositRefunds,
	notifications,
	transactions,
	tasks,
	vehicles,
};
