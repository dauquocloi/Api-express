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

	// test api
	app.get('/users/thu', (req, res) => {
		return res.send('welcome to API Thu');
	});

	// user create
	app.post('/users/create', User.create);

	// Register
	app.post('/register', User.register);

	// Login
	app.post('/login-user', User.login);

	// get cus by Email
	app.post('/getEmail', User.getEmail);

	// lấy dữ liệu người dùng token
	app.post('/usersData', User.getusersdata);

	app.get('/users/getUserByFullName', User.getUserByFullName);
	// -----------------ROOMS------------------//

	app.post('/rooms/create', Room.create);

	app.get('/rooms/:id', Room.getRoomById);

	app.get('/rooms', Room.getAll);

	app.get('/rooms/finance', Room.finance);

	app.post('/rooms/update', Room.update);

	app.post('/contracts/create', Contracts.create);

	app.post('/contracts/update', Contracts.updateOne);

	app.post('/buildings/create', Building.create);

	app.get('/buildings', Building.getAll);

	app.get('/services/getall', Service.getAll);

	app.post('/invoices/create', Invoice.create);

	app.get('/invoices/getall', Invoice.getAll);

	app.get('/rooms/:id/invoices', Invoice.getByRoomId);

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

	app.get('/customers/:customerId', Customer.getById);

	app.get('/buildings/:id/vehicles', Vehicle.getAll);
};
