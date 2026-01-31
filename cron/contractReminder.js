// cron/contractReminder.cron.js
const cron = require('node-cron');
const dayjs = require('dayjs');
const Services = require('../service');
const { roomState } = require('../constants/rooms');
const { NotiContractNearExpiJob } = require('../jobs/Notifications');
const { Connect } = require('../utils/MongoConnect');

// cron.schedule('0 0 * * *', async () => {
// 	try {
// 		console.log('[CRON] Checking contracts near expiration');

// 		const targetDate = dayjs().add(30, 'day').startOf('day').toDate();

// 		const contracts = await Services.contracts.findContractNearExpi(targetDate).populate('room').lean().exec();
// 		console.log('log of contracts: ', contracts);

// 		for (const contract of contracts) {
// 			await Services.rooms.updateRoomState({ roomId: contract.room._id, roomState: roomState['ABOUT_CHECKOUT'] });

// 			await new NotiContractNearExpiJob.enqueue({
// 				buildingId: contract.room.building,
// 				roomIndex: contract.room.roomIndex,
// 				roomId: contract.room._id,
// 				contractEndDate: contract.contractEndDate,
// 			});
// 		}
// 	} catch (error) {
// 		console.error(error);
// 	}
// });

// cron/contractReminder.cron.js

Connect('Qltro-test')
	.then(() => {
		console.log('✅ MongoDB connected');
	})
	.catch((err) => {
		console.error('❌ MongoDB connection failed:', err);
	});

const checkContracts = async () => {
	try {
		console.log('[TEST] Manual trigger: Checking contracts near expiration');
		const targetDate = dayjs().add(30, 'day').startOf('day').toDate();
		console.log('Target Date:', targetDate);

		const contracts = await Services.contracts.findContractNearExpi(targetDate).populate('room').lean().exec();
		console.log(`Found ${contracts.length} contracts.`);

		for (const contract of contracts) {
			await Services.rooms.updateRoomState({ roomId: contract.room._id, roomState: roomState['ABOUT_CHECKOUT'] });

			await new NotiContractNearExpiJob().enqueue({
				buildingId: contract.room.building,
				roomIndex: contract.room.roomIndex,
				roomId: contract.room._id,
				contractEndDate: contract.contractEndDate,
			});
		}
		console.log('Finish checking.');
	} catch (error) {
		console.error('Error in checkContracts:', error);
	}
};

checkContracts(); //test

cron.schedule('0 0 * * *', checkContracts);
