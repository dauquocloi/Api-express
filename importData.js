// const { Connect, Disconnect } = require('./utils/MongoConnect');
// const Services = require('./service');
// const banks = require('./banks.json');

// Connect(process.env.DB_NAME)
// 	.then(() => console.log('Đã kết nối DB'))
// 	.catch((err) => console.error('Kết nối thất bại: ', err));

// const _importBanks = async () => {
// 	for (const bank of banks) {
// 		const { fullName, bin, code, brandName, shortName, logoPath, iconPath, active } = bank;

// 		try {
// 			await Services.banks.importBank({ fullName, bin, code, brandName, shortName, logoPath, iconPath, active });
// 		} catch (error) {
// 			if (error.code === 11000) {
// 				console.log(`${bank.code} already exists`);
// 				continue;
// 			}

// 			throw error;
// 		}
// 	}

// 	await Disconnect();
// };

// _importBanks().catch((err) => console.error(err));
