require('dotenv').config();
const mongoose = require('mongoose');
const moment = require('moment');

const Services = require('../../service');
const generateContract = require('../../utils/generateContract');
const { handleGenerateContractJob } = require('../contract/contract.process');

const { FEE_UNIT_TYPE } = require('../../constants/fees');
const { contractStatus } = require('../../constants/contracts');
const { closeRedis } = require('../../config/redisClient');
const { Connect, Disconnect } = require('../../utils/MongoConnect');

// jest.mock('../../service');
// jest.mock('../../utils/generateContract');

beforeAll(async () => {
	console.log('log of DB_NAME: ', process.env.DB_NAME);
	await Connect(process.env.DB_NAME);
});

describe('handleGenerateContractJob', () => {
	const buildingId = '695a9eb8e8765a0ebbc0bae2';
	const contractId = '6ace5788c931bde6c17e2265';

	beforeEach(() => {
		jest.clearAllMocks();

		// contractQuery = {
		// 	populate: jest.fn().mockReturnThis(),
		// 	lean: jest.fn().mockReturnThis(),
		// 	exec: jest.fn().mockResolvedValue(mockContract),
		// };

		// customerQuery = {
		// 	lean: jest.fn().mockReturnThis(),
		// 	exec: jest.fn().mockResolvedValue(mockCustomer),
		// };

		// Services.contracts.findById.mockReturnValue(contractQuery);

		// Services.customers.findOwnerByContractId.mockReturnValue(customerQuery);

		// generateContract.mockResolvedValue({
		// 	Key: 'contracts/test-contract.pdf',
		// });

		// Services.contracts.importContractPdfUrlAndContractFile.mockResolvedValue({
		// 	success: true,
		// });

		// jest.spyOn(console, 'time').mockImplementation(() => {});
		// jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
		// jest.spyOn(console, 'log').mockImplementation(() => {});
		// jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('tạo PDF và cập nhật hợp đồng thành công', async () => {
		// Gọi handler với payload thực tế
		const result = await handleGenerateContractJob({
			contractId,
			buildingId,
		});

		// 2. Truy vấn hợp đồng thực tế sau khi xử lý
		const contract = await Services.contracts.findById(contractId).lean().exec();
		console.log('log of contract from test: ', contract);

		// 3. Kiểm tra thông tin PDF trong phiên bản đầu tiên
		expect(contract.versions[0].contractPdfUrl).toBe(result.versions[0].contractPdfUrl);

		expect(contract.versions[0].contractPdfFile).toBeDefined();
	});
});

afterAll(async () => {
	await closeRedis();
	Disconnect();
});
