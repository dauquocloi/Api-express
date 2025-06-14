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

	app.get('/rooms/finance', Room.finance);

	app.post('/rooms/update', Room.update);

	app.post('/contracts/create', Contracts.create);

	app.post('/contracts/update', Contracts.updateOne);

	app.post('/buildings/create', Building.create);

	app.get('/buildings', Building.getAll);

	app.get(`/buildings/:buildingId/managements`, User.getAllManagement);

	// app.get('/buildings/banks', Building.getBankStatus);

	app.get('/services/getall', Service.getAll);

	app.post('/invoices/create', Invoice.create);

	// app.get('/invoices/getall', Invoice.getAll);

	app.get('/buildings/:buildingId/invoices', Invoice.getAll);

	app.get('/buildings/:buildingId/Invoices/invoicesPaymentStatus', Invoice.getInvoicesPaymentStatus);

	app.get('/rooms/:roomId/invoices', Invoice.getByRoomId);

	app.get('/buildings/:buildingId/invoices/status', Invoice.getInvoiceStatus); // this is peace of shit

	app.get('/invoices/:invoiceId', Invoice.getInvoiceDetail);

	app.get('/messages/getAllMessagesByUserId', Message.getAllMessagesByUserId);

	app.get('/messages/byConversationId', Message.getMessagesByConversationId);

	app.post('/messages/newMessage', Message.newMessage);

	app.post('/message/testCreateMessage', Message.testCreateMessage);

	app.get('/message/getAllInfoByTextInput', Message.getAllInfoByTextInput);

	app.get('/conversations/getAll', Conversation.getAll);

	app.post('/file/upload', upload.single('image'), File.upLoadImages);

	app.get('/file/readExcel', File.readExcel);

	app.post('/file/readDocx', upload.single('file'), File.readDocx);

	app.get('/buildings/:buildingId/customers', Customer.getAll);

	app.get('/buildings/:buildingId/customers/leaved', Customer.getCustomerLeaved);

	app.get('/customers/:customerId', Customer.getCustomerById);

	app.post('/rooms/:roomId/customers', Customer.addCustomer);

	app.patch('/customers/:customerId', Customer.editCustomer);

	app.patch('/customers/:customerId/:status', Customer.setCustomerStatus);

	app.get('/buildings/:id/vehicles/:status', Vehicle.getAll);

	app.post('/rooms/:roomId/fees', Fee.addFee);

	app.delete('/fees/:feeId', Fee.deleteFee);

	app.patch('/fees/:feeId', Fee.editFee); //Only owner

	app.post('/files/s3', upload.single('image'), File.importS3Iamge);

	app.patch('/vehicles/:vehicleId', upload.single('image'), Vehicle.editVehicle);

	app.post('/customers/:customerId/vehicles', upload.single('image'), Vehicle.addVehicle);

	app.get('/vehicles/:vehicleId', Vehicle.getVehicle);

	app.post('/rooms/:roomId/import-image', upload.array('image', 10), Room.importImage);

	app.post('/rooms/:roomId/interiors', Room.addInterior);

	app.delete('/rooms/interiors/:interiorId', Room.removeInterior);

	app.patch('/rooms/:roomId/interiors/:interiorId', Room.editInterior);

	app.post('/rooms/:roomId/receipts', Receipt.createReceipt);

	app.post(`/companies`, Company.createCompany);

	app.get('/buildings/:buildingId/revenues', Statistic.getRevenues);

	app.get('/buildings/:buildingId/revenues/fees/:feeKey', Revenue.getFeeRevenueDetail);

	app.post('/buildings/:buildingId/expenditures', Expenditure.createExpenditure);

	app.get('/buildings/:buildingId/expenditures', Statistic.getExpenditures);

	app.patch('/expenditures/:expenditureId', Expenditure.modifyExpenditure);

	app.post('/buildings/:buildingId/incidentalRevenues', Revenue.createIncidentalRevenue);

	app.patch('/incidentalRevenues/:incidentalRevenueId', Revenue.modifyIncidentalRevenue);

	app.delete('/incidentalRevenues/:incidentalRevenueId', Revenue.deleteIncidentalRevenue);

	app.get('/buildings/:buildingId/statistics', Statistic.getStatistics);

	app.get('/feeInitial', Fee.getFeeInitial);

	app.post('/rooms/:roomId/deposits', Deposit.createDeposit);

	app.post('/rooms/:roomId/receipts-deposit', Receipt.createDepositReceipt);

	app.get('/buildings/:buildingId/deposits', Deposit.getListDeposits);

	app.get('/deposits/:depositId', Deposit.getDepositDetail);

	app.get('/buildings/:buildingId/receipts', Receipt.getListReceiptPaymentStatus);

	app.get('/receipts/:receiptId', Receipt.getReceiptDetail);

	app.post('/buildings/:buildingId/manager', User.createManager);

	app.post('/receipts/:receiptId/collect-cash', verifyToken, Receipt.collectCashMoney);

	app.delete('/receipts/:receiptId', Receipt.deleteReceipt);

	app.patch('/transactions/:transactionId/collect-money-employee', verifyToken, Transaction.collectCashFromEmployee);

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
