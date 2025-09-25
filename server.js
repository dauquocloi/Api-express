require('./instrument.js');
const Sentry = require('@sentry/node');

const express = require('express');
const app = express();
const errorHandler = require('./middleware/errorMidlewares');
// const server = require('http').createServer(app);
const port = 8080;
const routers = require('./routers');
const adminRouters = require('./routers/admin');
global.config = require('./config');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST'],
	},
});
const mongoose = require('mongoose');
const { Connect } = require('./utils/MongoConnect');

// const { getIO } = require('./utils/SocketConnect');
// const io = getIO(server);
app.use(cookieParser());

app.use(cors({ origin: '*' }));
app.use(
	express.json({
		limit: '500mb',
	}),
);
app.use(
	express.urlencoded({
		limit: '500mb',
		extended: true,
	}),
);

// -----------SOCKET--------------------//

const userSocketMap = {};
const groupSocketMap = [];

io.on('connection', (socket) => {
	console.log('a user connected ', socket.id);

	const currentUserId = socket.handshake.query.userId;
	console.log(currentUserId);

	if (currentUserId != undefined) {
		userSocketMap[currentUserId] = socket.id;
	}

	socket.on('joinRoom', ({ groupId, roomName }) => {});

	socket.on('sendMessage', ({ senderId, receiverId, message }) => {
		console.log('[server<sendMessage>receiverId:', receiverId);

		const receiveSocketId = userSocketMap[receiverId];
		console.log('[server/sendMessage<receiveSocketId>:', receiveSocketId);
		if (receiveSocketId) {
			socket.to(receiveSocketId).emit('receiveMessage', { senderId, message });
		}
	});

	socket.on('sendMessageToGroupChat', ({ senderId, messageContent, groupId }) => {
		console.log('[server<sendMessageToGroupChat>groupId:', groupId);
		socket.to(groupId).emit('receiveMessage', { senderId, messageContent });
	});

	socket.on('disconnect', () => {
		console.log('user has disconnected: ', socket.id);
	});
});

// Gọi hàm Connect và chỉ chạy server nếu kết nối thành công
Connect('Qltro-test')
	.then(() => {
		console.log('✅ Đã kết nối MongoDB Atlas');
	})
	.catch((err) => {
		console.error('❌ Kết nối MongoDB thất bại:', err);
	});

//khai báo router
routers.routerApi(app);
adminRouters.adminRouters(app);

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

//middleware handle error
app.use(errorHandler);
server.listen(port);

console.log('Server is listening on port ' + port);
