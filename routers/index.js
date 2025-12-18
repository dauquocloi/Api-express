// const User = require('./users/users');
// const Room = require('./rooms');
// const Contract = require('./contracts');
// const Building = require('./buildings');
// const Service = require('./services');
// const Invoice = require('./invoices');
// const Message = require('./messages');
// const Conversation = require('./conversations');
// const File = require('./files');
// const upload = require('../middleware/multer');
// const Customer = require('./customers');
// const Vehicle = require('./vehicles');
// const Notification = require('./notifications');
// const Fee = require('./fees');
// const Auth = require('./auth');
// const Receipt = require('./receipts');
// const Company = require('./companies');
// const SepayTest = require('./sepayApiTest');
// const Statistic = require('./statistics');
// const Expenditure = require('./expenditures/expenditures');
// const Revenue = require('./revenues/revenues');
// const Transaction = require('./transactions');
// const Deposit = require('./deposits');
// const Debt = require('./debts');
// const Task = require('./tasks');
// const DepositRefund = require('./depositRefunds');
// const Zalo = require('./admin/zalo');

// Refactory 10/12/2025
const Login = require('./access/login');
const Buildings = require('./buildings');
const Customers = require('./customers');
const Contracts = require('./contracts');
const Expenditures = require('./expenditures');
const Fees = require('./fees');
const Rooms = require('./rooms');
const Revenues = require('./revenues');
const Receipts = require('./receipts');
const Invoices = require('./invoices');
const Deposits = require('./deposits');
const DepositRefunds = require('./depositRefunds');
const Notifications = require('./notifications');
const Users = require('./users');
const Vehicles = require('./vehicles');
const Tasks = require('./tasks');

const express = require('express');
const router = express.Router();

//middleware
const verifyToken = require('../middleware/verifyToken');
const idempotency = require('..//middleware/idempotency');

// Route với nhiều middleware
const firstMiddleware = (req, res, next) => {
	const { ten } = req.body;
	if (ten != 'loi') {
		console.log('khong phai loi');
	} else {
		console.log('Loi day');
	}
	next();
};

{
	/* Router of API 
exports.routerApi = (app) => {
	// default
	app.get('/', (req, res) => {
		return res.send(`
    		<!DOCTYPE html>
    			<html lang="vi">
					<head>
						<meta charset="UTF-8" />
						<meta name="zalo-platform-site-verification" content="O-JXEx_tCsPMqULFa_rZJ6hOnNM6hX8kCZ4q" />
						<title>API Express Server</title>
					</head>
					<body>
						<h1>Welcome to API Express Server!</h1>
					</body>
   				 </html>
  `);
	});

	// app.post('/send-notification', Notification.sendNotification);

	app.post('/auths/refreshToken/:userId', Auth.refreshToken);

	// Router of user
	app.get('/users/getAll', [firstMiddleware], User.getAll);

	app.get('/users/managers', verifyToken, User.getAllManagers);

	// test api
	app.get('/users/thu', (req, res) => {
		return res.send('welcome to API Thu');
	});

	app.post('/users/create', User.create);
	app.delete('/users/:managerId', User.removeManager);
	app.post('/register', User.register);
	// app.post('/login', User.login);
	app.patch('/users/:userId/password', User.modifyPassword);
	app.patch('/users/:userId', User.modifyUserInfo);
	app.post('/getEmail', User.getEmail);
	app.post('/usersData', User.getusersdata);
	app.get('/users/getUserByFullName', User.getUserByFullName);
	app.get('/settings/notifications', verifyToken, User.getNotiSettings);
	app.patch('/settings/notifications', verifyToken, User.setSettingNotification);
	app.get(`/buildings/permissions`, verifyToken, User.getBuildingPermissions);
	app.patch(`/buildings/:buildingId/permissions`, verifyToken, User.setBuildingPermission);
	app.patch('/users/managements/:userId', User.modifyUserPermission);
	app.get('/users/managements/collectedCash/:userId', User.checkManagerCollectedCash); //owner only
	app.patch('/users/managements/buildingManagement/:userId', User.changeUserBuildingManagement); //owner only
	app.post('/buildings/:buildingId/manager', User.createManager);

	// -----------------ROOMS------------------//

	app.post('/rooms/create', Room.create);

	app.get('/buildings/:buildingId/list-selecting-rooms', Room.getListSelectingRoom);

	app.get('/rooms/:roomId', Room.getRoom);

	app.get('/buildings/:buildingId/rooms', verifyToken, Room.getAll);

	app.get('/buildings/:buildingId/contract', Building.getBuildingContract);

	app.get('/rooms/finance', Room.finance);

	app.post('/rooms/update', Room.update);

	app.post('/contracts/create', Contract.create); // this is piece of shit;

	app.post('/contracts/generate', Contract.generateContract);

	app.get('/contracts/:contractCode/pdf', Contract.getContractPdfSignedUrl);

	app.post('/contracts/update', Contract.updateOne);

	app.post('/buildings/create', Building.create);

	app.get('/buildings', Building.getAll);

	app.get(`/managements`, verifyToken, User.getAllManagement);

	app.post('/buildings/:buildingId/contract', upload.single('file'), Building.importContractFile);

	app.post('/buildings/:buildingId/deposit-term-file', upload.single('file'), Building.importDepositTermFile);

	app.get('/buildings/:buildingId/depositTermFile', Building.getDepositTermFile);

	// app.get('/buildings/banks', Building.getBankStatus);

	app.get('/services/getall', Service.getAll);

	app.post('/invoices/create', Invoice.create);

	app.patch('/invoices/:invoiceId', Invoice.modifyInvoice);

	app.post('/invoices/first-invoice', Invoice.generateFirstInvoice);

	// app.get('/invoices/getall', Invoice.getAll);

	app.get('/buildings/:buildingId/invoices', Invoice.getAll);

	app.get('/buildings/:buildingId/invoices/payment-status', Invoice.getInvoicesPaymentStatus);

	app.get('/rooms/:roomId/fees-debts', Invoice.getFeeForGenerateInvoice);

	app.get('/buildings/:buildingId/invoices/status', Invoice.getInvoiceStatus); // this is peace of shit

	app.get('/invoices/:invoiceId', Invoice.getInvoiceDetail);

	app.delete('/invoices/:invoiceId', Invoice.deleteInvoice);

	app.get('/messages/getAllMessagesByUserId', Message.getAllMessagesByUserId);

	app.get('/messages/byConversationId', Message.getMessagesByConversationId);

	app.post('/messages/newMessage', Message.newMessage);

	app.post('/message/testCreateMessage', Message.testCreateMessage);

	app.get('/message/getAllInfoByTextInput', Message.getAllInfoByTextInput);

	app.get('/conversations/getAll', Conversation.getAll);

	app.post('/file/upload', upload.single('image'), File.uploadFiles);

	app.get('/file/readExcel', File.readExcel);

	app.post('/file/readDocx', upload.single('file'), File.readDocx);

	app.get('/buildings/:buildingId/customers', Customer.getAll);

	app.get('/rooms/:roomId/listSelectingCustomer', Customer.getListSelectingCustomer);

	app.get('/buildings/:buildingId/customers/leaved', Customer.getCustomerLeaved);

	app.get('/customers/:customerId', Customer.getCustomerById);

	app.post('/rooms/:roomId/customers', Customer.addCustomer);

	app.patch('/customers/:customerId', Customer.editCustomer);

	app.patch('/customers/:customerId/:status', Customer.setCustomerStatus);

	app.get('/buildings/:id/vehicles/:status', Vehicle.getAll);

	app.post('/rooms/:roomId/fees', Fee.addFee);

	app.delete('/rooms/:roomId/fees/:feeId', Fee.deleteFee);

	app.patch('/fees/:feeId', Fee.editFee); //Only owner

	app.post('/files/s3', upload.single('file'), File.importS3Iamge);

	app.patch('/vehicles/:vehicleId', upload.single('image'), Vehicle.editVehicle);

	app.post('/customers/:customerId/vehicles', upload.single('image'), Vehicle.addVehicle);

	app.get('/vehicles/:vehicleId', Vehicle.getVehicle);

	app.post('/rooms/:roomId/import-image', upload.array('image', 5), Room.importImage);

	app.post('/rooms/:roomId/interiors', Room.addInterior);

	app.delete('/rooms/interiors/:interiorId', Room.removeInterior);

	app.patch('/rooms/:roomId/interiors/:interiorId', Room.editInterior);

	app.delete('/rooms/:roomId/debts', Debt.deleteDebts);

	app.post('/rooms/:roomId/receipts', Receipt.createReceipt);

	app.patch('/receipts/:receiptId', Receipt.modifyReceipt);

	app.post(`/companies`, Company.createCompany);

	app.get('/buildings/:buildingId/revenues', Statistic.getRevenues);

	app.get('/buildings/:buildingId/revenues/fees/:feeKey', Revenue.getFeeRevenueDetail);

	app.post('/buildings/:buildingId/expenditures', Expenditure.createExpenditure);

	app.patch('/expenditures/:expenditureId', Expenditure.modifyExpenditure);

	app.delete('/expenditures/:expenditureId', Expenditure.deleteExpenditure);

	app.get('/buildings/:buildingId/expenditures', Statistic.getExpenditures);

	app.post('/buildings/:buildingId/incidentalRevenues', Revenue.createIncidentalRevenue);

	app.patch('/incidentalRevenues/:incidentalRevenueId', Revenue.modifyIncidentalRevenue);

	app.delete('/incidentalRevenues/:incidentalRevenueId', Revenue.deleteIncidentalRevenue);

	app.get('/buildings/:buildingId/statistics', Statistic.getStatistics);

	app.get('/feeInitial', Fee.getFeeInitial);

	app.post('/rooms/:roomId/deposits', Deposit.createDeposit);

	app.post('/rooms/:roomId/depositReceipt-invoice', Room.generateDepositReceiptAndFirstInvoice);

	app.patch('/deposits/:depositId', Deposit.modifyDeposit);

	app.post('/rooms/:roomId/receipts-deposit', Receipt.createDepositReceipt);

	app.post('/rooms/:roomId/receipts-debt', Receipt.createDebtsReceipt);

	app.get('/buildings/:buildingId/deposits', Deposit.getListDeposits);

	app.get('/deposits/:depositId', Deposit.getDepositDetail);

	app.get('/rooms/:roomId/deposits', Deposit.getDepositDetailByRoomId);

	app.post('/deposits/:depositId/terminated', Deposit.terminateDeposit);

	app.get('/buildings/:buildingId/receipts', Receipt.getListReceiptPaymentStatus);

	app.get('/receipts/deposit', Receipt.getDepositReceiptDetail);

	app.get('/receipts/:receiptId', Receipt.getReceiptDetail);

	app.post('/receipts/:receiptId/collect-cash', [verifyToken, idempotency], Receipt.collectCashMoney);

	app.post('/invoices/:invoiceId/collect-cash', [verifyToken, idempotency], Invoice.collectCashMoney);

	app.delete('/receipts/:receiptId', Receipt.deleteReceipt);

	app.patch('/transactions/:transactionId/collect-money-employee', verifyToken, Transaction.collectCashFromEmployee);

	app.get('/rooms/:roomId/debts-receipts-unpaid', Debt.getCreateDepositRefundInfo);

	app.post('/rooms/:roomId/deposit-refund', verifyToken, DepositRefund.generateDepositRefund);

	// app.get('/rooms/:roomId/deposit-refund', Room.getDepositRefund);

	app.get('/depositRefunds/:depositRefundId', DepositRefund.getDepositRefund);

	app.patch('/depositRefunds/:depositRefundId', DepositRefund.modifyDepositRefund);

	app.post('/depositRefunds/:depositRefundId/submit', verifyToken, DepositRefund.submitDepositRefund);

	app.put('/rooms/:roomId/note', Room.updateNoteRoom);

	app.post('/tasks', verifyToken, Task.createTask);

	app.get('/tasks', verifyToken, Task.getTasks);

	app.patch('/tasks/:taskId', verifyToken, upload.array('image', 4), Task.modifyTask);

	app.delete('/tasks/:taskId', verifyToken, Task.deleteTask);

	app.get('/tasks/:taskId', Task.getTaskDetail);

	app.get('/api/v1/bills/:billCode', Invoice.getInvoiceInfoByInvoiceCode);

	app.get('/buildings/:buildingId/statisticGeneral', verifyToken, Statistic.getStatisticGeneral);

	app.get('/buildings/:buildingId/bill-collection-progress', Building.getBillCollectionProgress);

	app.get('/notifications', verifyToken, Notification.getNotifications);

	app.get('/buildings/:buildingId/deposit-refunds', DepositRefund.getAllDepositRefunds);

	app.patch('/contracts/:contractId/expected-move-out-date', Contract.setExpectedMoveOutDate);

	app.patch('/rooms/:roomId/cancel-early-move-out', Contract.cancelIsEarlyTermination);

	app.patch('/rooms/:roomId/rental-fee', Room.modifyRent);

	app.delete('/contracts/:contractId', Contract.terminateContractUnRefund);

	app.post('/rooms/:roomId/checkout-costs', verifyToken, Room.generateCheckoutCost);

	app.get('/checkoutCosts/:checkoutCostId', Room.getCheckoutCostDetail);

	app.get('/buildings/:buildingId/checkout-costs', Room.getCheckoutCosts);

	// app.post('/buildings/:buildingId/deposit-term-file', upload.single('file'), Deposit.uploadDepositTerm);

	//  ------------ZALO API---------------- //

	app.get('/zalo-verification', (req, res) => {
		res.send(`
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta name="zalo-platform-site-verification" content="O-JXEx_tCsPMqULFa_rZJ6hOnNM6hX8kCZ4q" />
      </head>
      <body>
        Zalo Verification Page
      </body>
    </html>
  `);
	});

	app.get('/api/v1/zalo/callback', Zalo.zaloCallback);

	// ----TRANSACTION RECEIVING API------//

	app.post('/sepay/transactions');

	//-----TRANSACTION-------//

	app.post(`/sepay/ipn`);

	// --------TEST API----------//

	// app.post(`/banks/create`);

	// app.post(`/acb/individual/bankAccount/create`);

	app.post(`/sepay/company/create`, SepayTest.createCompany);

	app.get(`/sepay/bank`, SepayTest.getBank);

	app.post(`/mb/individual/bankAccount/lookUpAccountHolderName`, SepayTest.mbGetAccountHolderName);

	app.post(`/mb/individual/bankAccount/create`, SepayTest.mbBankAccountCreate);

	app.post(`/mb/individual/bankAccount/confirmApiConnection`, SepayTest.mbBankconfirmApiConnection);
};
*/
}

router.use('/login', Login);
router.use('/buildings', Buildings);
router.use('/contracts', Contracts);
router.use('/deposits', Deposits);
router.use('/depositRefunds', DepositRefunds);
router.use('/customers', Customers);
router.use('/expenditures', Expenditures);
router.use('/fees', Fees);
router.use('/rooms', Rooms);
router.use('/revenues', Revenues);
router.use('/receipts', Receipts);
router.use('/notifications', Notifications);
router.use('/invoices', Invoices);
router.use('/users', Users);
router.use('/vehicles', Vehicles);
router.use('/tasks', Tasks);

module.exports = router;
