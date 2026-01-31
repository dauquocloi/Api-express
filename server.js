require('./instrument.js');
const Sentry = require('@sentry/node');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// ========== CONFIG ==========
const port = 8080;
global.config = require('./config');

// ========== IMPORT ==========
const { initializeInstances } = require('./instance');
const { Connect } = require('./utils/MongoConnect');
const errorHandler = require('./middleware/errorMidlewares');
const routers = require('./routers');

// ========== EXPRESS & SOCKET SETUP ==========
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST'],
	},
});

const { transactionManager } = initializeInstances(io);
console.log('✅ TransactionManager initialized');

// ========== EXPRESS MIDDLEWARE ==========
app.use(cookieParser());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// ========== SOCKET EVENTS ==========
io.on('connection', (socket) => {
	console.log(`✅ Client connected: ${socket.id}`);

	// Subscribe transaction
	socket.on('receipt:subscribe', (data) => {
		const { receiptId } = data;
		socket.join(`receipt:${receiptId}`);

		socket.emit('receipt:currentStatus', {
			id: receiptId,
			status: 'unknown',
		});

		console.log(`📌 Subscribed: ${receiptId}`);
	});

	socket.on('receipt:unsubscribe', (data) => {
		const { receiptId } = data;
		socket.leave(`receipt:${receiptId}`);
		console.log(`🔴 Unsubscribed: ${receiptId}`);
	});

	socket.on('invoice:subscribe', (data) => {
		const { invoiceId } = data;
		socket.join(`invoice:${invoiceId}`);

		console.log(`📌 Subscribed: ${invoiceId}`);
	});

	socket.on('invoice:unsubscribe', (data) => {
		const { invoiceId } = data;
		socket.leave(`invoice:${invoiceId}`);
		console.log(`🔴 Unsubscribed: ${invoiceId}`);
	});

	socket.on('disconnect', () => {
		console.log(`❌ Disconnected: ${socket.id}`);
	});
});

// ========== DATABASE CONNECTION ==========
Connect('Qltro-test')
	.then(() => {
		console.log('✅ MongoDB connected');
	})
	.catch((err) => {
		console.error('❌ MongoDB connection failed:', err);
	});

// ========== ROUTES ==========
app.use('/', routers);

// ========== ERROR HANDLER ==========
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

// ========== START SERVER ==========
server.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});

module.exports = { io, transactionManager };
