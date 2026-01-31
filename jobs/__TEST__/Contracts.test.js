const { GeneratePdfContractJob } = require('../Contracts');
const Services = require('../../service');
const mongoose = require('mongoose');
const generateContract = require('../../utils/generateContract');

jest.mock('../../service');
jest.mock('../../utils/generateContract');

// Mock mongoose.isValidObjectId để luôn trả về true
jest.spyOn(mongoose, 'isValidObjectId').mockReturnValue(true);

describe('GeneratePdfContractJob', () => {
	let job;

	beforeEach(() => {
		job = new GeneratePdfContractJob();
		jest.clearAllMocks();
	});

	it('nên xử lý tạo PDF và cập nhật hợp đồng thành công', async () => {
		const mockPayload = {
			buildingId: '695a9eb8e8765a0ebbc0bae2',
			contractId: '6960b28e3f038213dd2883f6',
			rent: 10000000,
		};

		const mockCustomer = {
			fullName: 'Nguyen Van A',
			dob: '1990-01-01',
			address: 'Hà Nội',
			cccd: '123456789',
			phone: '0909090909',
		};

		// MOCK CHUỖI: findOwnerByContractId().lean().exec()
		// Sử dụng mockReturnThis để chuỗi chain không bị đứt gãy
		const mockQuery = {
			lean: jest.fn().mockReturnThis(),
			exec: jest.fn().mockResolvedValue(mockCustomer),
		};
		Services.customers.findOwnerByContractId.mockReturnValue(mockQuery);

		generateContract.mockResolvedValue({ Key: 'contracts/test-pdf.pdf' });
		Services.contracts.importContractPdfUrlAndContractFile.mockResolvedValue({ success: true });

		const result = await job.handler(mockPayload);

		// KIỂM TRA
		// Sử dụng expect.any(Object) vì contractId truyền vào hàm đã bị biến đổi thành ObjectId
		expect(Services.customers.findOwnerByContractId).toHaveBeenCalledWith(expect.anything());
		expect(result).toEqual({ success: true });
		console.log('✅ Case thành công đã Pass!');
	});

	it('nên báo lỗi nếu không tìm thấy khách hàng', async () => {
		// Thiết lập trả về null cho trường hợp không tìm thấy
		const mockQueryNull = {
			lean: jest.fn().mockReturnThis(),
			exec: jest.fn().mockResolvedValue(null),
		};
		Services.customers.findOwnerByContractId.mockReturnValue(mockQueryNull);

		await expect(
			job.handler({
				buildingId: '695a9eb8e8765a0ebbc0bae2',
				contractId: '6960b28e3f038213dd2883f6',
			}),
		).rejects.toThrow('Lỗi không tìm thấy khách hàng !');

		console.log('✅ Case lỗi khách hàng đã Pass!');
	});
});
