const { TransactionManager } = require('./events');

let io = null;
let transactionManager = null;
let isInitialized = false;

function initializeInstances(_io) {
	if (isInitialized) {
		console.log('⚠️ Instances already initialized');
		return { io, transactionManager };
	}

	io = _io;
	transactionManager = new TransactionManager(io);
	isInitialized = true;

	console.log('✅ Instances initialized');
	return { io, transactionManager };
}

function getInstances() {
	if (!isInitialized) {
		throw new Error('❌ Instances not initialized. Call initializeInstances() in server.js first!');
	}
	return { io, transactionManager };
}

function getTransactionManager() {
	if (!transactionManager) {
		throw new Error('❌ transactionManager not initialized');
	}
	return transactionManager;
}

function getIO() {
	if (!io) {
		throw new Error('❌ io not initialized');
	}
	return io;
}

module.exports = {
	initializeInstances,
	getInstances,
	getTransactionManager,
	getIO,
	get transactionManager() {
		return transactionManager;
	},
	get io() {
		return io;
	},
};
