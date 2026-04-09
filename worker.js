require('./workers');
const { Connect: ConnectMongoDb } = require('./utils/MongoConnect');

ConnectMongoDb('Qltro-test')
	.then(() => {
		console.log('✅ Đã kết nối MongoDB Atlas');
	})
	.catch((err) => {
		console.error('❌ Kết nối MongoDB thất bại:', err);
	});

console.log('✅ Worker started');
