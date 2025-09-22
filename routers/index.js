const User = require('./users');
const Room = require('./rooms');
const Contracts = require('./contracts');
const Building = require('./buildings');
const Service = require('./services');
const Invoice = require('./invoices');
const Message = require('./messages');
const Conversation = require('./conversations');
const File = require('./files');
const upload = require('../middleware/multer');
const Customer = require('./customers');
const Vehicle = require('./vehicles');
const Notification = require('../utils/notificationUtils');
const Fee = require('./fees');
const Auth = require('./auth');
const verifyToken = require('../middleware/verifyToken');
const Receipt = require('./receipts');
const Company = require('./companies');
const SepayTest = require('./sepayApiTest');
const Statistic = require('./statistics');
const Expenditure = require('./expenditures');
const Revenue = require('./revenues');
const Transaction = require('./transactions');
const Deposit = require('./deposits');
const Debt = require('./debts');
const Task = require('./tasks');

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

exports.routerApi = (app) => {
	// default
	app.get('/', (req, res) => {
		return res.send('Welcome to API Gateway version 1.0.0');
	});

	app.post('/send-notification', Notification.sendNotification);

	// Router of user

	// get all user
	app.get('/users/getAll', [firstMiddleware], User.getAll);

	app.get('/users/:userId/managers', User.getAllManagers);

	// test api
	app.get('/users/thu', (req, res) => {
		return res.send('welcome to API Thu');
	});

	app.post('/auths/refreshToken/:userId', Auth.refreshToken);

	// user create
	app.post('/users/create', User.create);

	app.delete('/users/:managerId', User.removeManager);

	// Register
	app.post('/register', User.register);

	// Login
	app.post('/login', User.login);

	app.patch('/users/:userId/password', User.modifyPassword);

	app.patch('/users/:userId', User.modifyUserInfo);

	// get cus by Email
	app.post('/getEmail', User.getEmail);

	// lấy dữ liệu người dùng token
	app.post('/usersData', User.getusersdata);

	app.get('/users/getUserByFullName', User.getUserByFullName);
	// -----------------ROOMS------------------//

	app.post('/rooms/create', Room.create);

	app.get('/buildings/:buildingId/list-selecting-rooms', Room.getListSelectingRoom);

	app.get('/rooms/:roomId', Room.getRoom);

	app.get('/buildings/:buildingId/rooms', verifyToken, Room.getAll);

	app.get('/buildings/:buildingId/contract', Building.getBuildingContract);

	app.get('/rooms/finance', Room.finance);

	app.post('/rooms/update', Room.update);

	app.post('/contracts/create', Contracts.create); // this is piece of shit;

	app.post('/contracts/generate', Contracts.generateContract);

	app.get('/rooms/:roomId/contracts', Contracts.getContractPdfSignedUrl);

	app.post('/contracts/update', Contracts.updateOne);

	app.post('/buildings/create', Building.create);

	app.get('/buildings', Building.getAll);

	app.get(`/managements`, verifyToken, User.getAllManagement);

	app.post('/buildings/:buildingId/contract', upload.single('file'), Building.importContractFile);

	app.post('/buildings/:buildingId/depositTermFile', upload.single('file'), Building.importDepositTermFile);

	app.get('/buildings/:buildingId/depositTermFile', Building.getDepositTermFile);

	// app.get('/buildings/banks', Building.getBankStatus);

	app.get('/services/getall', Service.getAll);

	app.post('/invoices/create', Invoice.create);

	app.post('/invoices/first-invoice', Invoice.generateFirstInvoice);

	// app.get('/invoices/getall', Invoice.getAll);

	app.get('/buildings/:buildingId/invoices', Invoice.getAll);

	app.get('/buildings/:buildingId/Invoices/invoicesPaymentStatus', Invoice.getInvoicesPaymentStatus);

	app.get('/rooms/:roomId/invoices', Invoice.getFeeForGenerateInvoice);

	app.get('/buildings/:buildingId/invoices/status', Invoice.getInvoiceStatus); // this is peace of shit

	app.get('/invoices/:invoiceId', Invoice.getInvoiceDetail);

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

	app.delete('/fees/:feeId', Fee.deleteFee);

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

	app.post('/rooms/depositReceipt-invoice', Room.generateDepositReceiptAndFirstInvoice);

	app.patch('/deposits/:depositId', Deposit.modifyDeposit);

	app.post('/rooms/:roomId/receipts-deposit', Receipt.createDepositReceipt);

	app.post('/rooms/:roomId/receipts-debt', Receipt.createDebtsReceipt);

	app.get('/buildings/:buildingId/deposits', Deposit.getListDeposits);

	app.get('/deposits/:depositId', Deposit.getDepositDetail);

	app.get('/deposits', Deposit.getDepositDetailByRoomId);

	app.post('/deposits/:depositId/terminated', Deposit.terminateDeposit);

	app.get('/buildings/:buildingId/receipts', Receipt.getListReceiptPaymentStatus);

	app.get('/receipts/deposit', Receipt.getDepositReceiptDetail);

	app.get('/receipts/:receiptId', Receipt.getReceiptDetail);

	app.post('/buildings/:buildingId/manager', User.createManager);

	app.post('/receipts/:receiptId/collect-cash', verifyToken, Receipt.collectCashMoney);

	app.post('/invoices/:invoiceId/collect-cash', verifyToken, Invoice.collectCashMoney);

	app.delete('/receipts/:receiptId', Receipt.deleteReceipt);

	app.patch('/transactions/:transactionId/collect-money-employee', verifyToken, Transaction.collectCashFromEmployee);

	app.get('/rooms/:roomId/debts-receiptsUnpaid', Debt.getDebtsByRoomId);

	app.post('/rooms/:roomId/deposit-refund', Room.generateDepositRefund);

	app.get('/rooms/:roomId/deposit-refund', Room.getDepositRefund);

	app.put('/rooms/:roomId/note', Room.updateNoteRoom);

	app.post('/tasks', verifyToken, Task.createTask);

	app.get('/tasks', verifyToken, Task.getTasks);

	app.patch('/tasks/:taskId', verifyToken, upload.array('image', 4), Task.modifyTask);

	app.delete('/tasks/:taskId', verifyToken, Task.deleteTask);

	app.get('/tasks/:taskId', Task.getTaskDetail);

	app.get('/api/v1/bills/:billCode', Invoice.getInvoiceInfoByInvoiceCode);

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
