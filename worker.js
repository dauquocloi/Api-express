const { Connect: ConnectMongoDb } = require('./utils/MongoConnect');

async function startWorker() {
	try {
		await ConnectMongoDb('Qltro-test');
		console.log('✅ Đã kết nối MongoDB Atlas');
		require('./workers');
	} catch (err) {
		console.error('❌ Kết nối MongoDB thất bại:', err);
	}
}

startWorker();
