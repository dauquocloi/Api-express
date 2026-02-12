const mongoose = require('mongoose');
const DataProviders = require('../invoices');
const Services = require('../../service');
const Entity = require('../../models');
const redis = require('../../config/redisClient');

jest.mock('../../service');
jest.mock('../../models');
jest.mock('../../config/redisClient');

describe('createInvoice', () => {
	let session;
	// use valid 24-char hex strings to avoid BSONError
	const roomId = new mongoose.Types.ObjectId().toHexString();
	const buildingId = new mongoose.Types.ObjectId().toHexString();
	const createrId = new mongoose.Types.ObjectId().toHexString();
	const roomVersion = 99;
	const redisKey = 'redis-test';
	const stayDays = 7;

	beforeEach(() => {
		jest.clearAllMocks();

		session = {
			withTransaction: jest.fn(async (cb) => cb()),
			endSession: jest.fn(),
		};
		mongoose.startSession = jest.fn().mockResolvedValue(session);

		Services.rooms.assertRoomWritable = jest.fn().mockResolvedValue();
		Services.customers.findIsContractOwnerByRoomId = jest.fn().mockReturnValue({
			session: jest.fn().mockReturnThis(),
			populate: jest.fn().mockReturnThis(),
			lean: jest.fn().mockReturnThis(),
			exec: jest.fn().mockResolvedValue({
				fullName: 'Nguyen Van A',
				contract: { _id: new mongoose.Types.ObjectId().toHexString() },
			}),
		});

		Entity.DebtsEntity.updateMany = jest.fn().mockResolvedValue({});
		Services.fees.updateFeeIndexValues = jest.fn().mockResolvedValue();
		Services.fees.updateFeeIndexHistoryMany = jest.fn().mockResolvedValue();
		Services.rooms.unLockedRoom = jest.fn().mockResolvedValue();
		Services.rooms.bumpRoomVersion = jest.fn().mockResolvedValue();
		redis.set = jest.fn().mockResolvedValue();
		// ensure getCurrentPeriod() query chain works
		Entity.StatisticsEntity = {
			findOne: jest.fn().mockReturnValue({
				sort: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue({ month: 1, year: 2020, statisticsStatus: 'unLock' }),
			}),
		};
	});

	it('should start a session and call withTransaction and bumpRoomVersion (version check)', async () => {
		// prepare fees for generateInvoiceFees
		const fee1Id = new mongoose.Types.ObjectId().toHexString();
		const roomFees = {
			feeInfo: [{ _id: fee1Id, feeAmount: 2, feeName: 'Water', unit: 'index', feeKey: 'W1' }],
			_id: { rent: 100000 },
		};
		Services.fees.getRoomFeesAndDebts = jest.fn().mockResolvedValue(roomFees);
		Services.debts.getDebts = jest.fn().mockResolvedValue([]);

		// spy on Services.invoices.createInvoice to capture payload
		const createdInvoice = { _id: new mongoose.Types.ObjectId().toHexString() };
		Services.invoices.createInvoice = jest.fn().mockResolvedValue(createdInvoice);

		const feeIndexValues = {
			[fee1Id]: { firstIndex: 10, secondIndex: 15 },
		};

		const result = await DataProviders.createInvoice(roomId, buildingId, stayDays, feeIndexValues, createrId, roomVersion, redisKey);

		expect(mongoose.startSession).toHaveBeenCalled();
		expect(session.withTransaction).toHaveBeenCalled();
		expect(Services.invoices.createInvoice).toHaveBeenCalled();

		// ensure bumpRoomVersion gets the roomVersion passed in
		expect(Services.rooms.bumpRoomVersion).toHaveBeenCalledWith(roomId, roomVersion, session);

		// ensure returned result is the created invoice
		expect(result).toBe(createdInvoice);

		// redis SUCCESS set called
		expect(redis.set).toHaveBeenCalledWith(redisKey, expect.stringContaining('SUCCESS'), 'EX', process.env.REDIS_EXP_SEC);
	});

	it('should compute total correctly for mixed fees (index + room + person + vehicle)', async () => {
		// Setup mixed fees
		const feeIndexId = new mongoose.Types.ObjectId().toHexString();
		const feePersonId = new mongoose.Types.ObjectId().toHexString();
		const feeVehicleId = new mongoose.Types.ObjectId().toHexString();

		const roomFees = {
			feeInfo: [
				{ _id: feeIndexId, feeAmount: 5, feeName: 'Electric', unit: 'index', feeKey: 'E' },
				{ _id: feePersonId, feeAmount: 300, feeName: 'Per Person', unit: 'person', customerInfo: [1, 2], feeKey: 'P' },
				{ _id: feeVehicleId, feeAmount: 200, feeName: 'Vehicle', unit: 'vehicle', vehicleInfo: [1], feeKey: 'V' },
			],
			_id: { rent: 900 }, // rent amount
		};
		Services.fees.getRoomFeesAndDebts = jest.fn().mockResolvedValue(roomFees);
		Services.debts.getDebts = jest.fn().mockResolvedValue([]);

		const feeIndexValues = {
			[feeIndexId]: { firstIndex: 10, secondIndex: 13 }, // (13-10)*5 = 15
		};

		// spy on createInvoice to capture the payload
		let capturedPayload = null;
		Services.invoices.createInvoice = jest.fn().mockImplementation(async (payload, sess) => {
			capturedPayload = payload;
			return { _id: new mongoose.Types.ObjectId().toHexString(), ...payload };
		});

		const res = await DataProviders.createInvoice(roomId, buildingId, stayDays, feeIndexValues, createrId, roomVersion, redisKey);

		// manual compute:
		// rent: (900/30)*7 = 210 => Math.round -> 210
		// index: (13-10)*5 = 15
		// person: calculateFeeUnitQuantityAmount(300, quantity=2, stayDays=7) = Math.round(((300*2)/30)*7)= Math.round(140)=140
		// vehicle: ((200*1)/30)*7 = 46.666.. -> Math.round -> 47
		const expectedTotal = 210 + 15 + 140 + 47; // 412

		expect(capturedPayload).not.toBeNull();
		expect(capturedPayload.totalInvoiceAmount).toBe(expectedTotal);
		expect(res.totalInvoiceAmount).toBe(expectedTotal);
	});

	it('should handle decimal rounding and negative stayDays correctly', async () => {
		// Decimal rent and stayDays negative case
		const roomFees = {
			feeInfo: [{ _id: new mongoose.Types.ObjectId().toHexString(), feeAmount: 1234.56, feeName: 'RoomFee', unit: 'room', feeKey: 'R' }],
			_id: { rent: 1234.56 },
		};
		Services.fees.getRoomFeesAndDebts = jest.fn().mockResolvedValue(roomFees);
		Services.debts.getDebts = jest.fn().mockResolvedValue([]);
		Services.invoices.createInvoice = jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId().toHexString() });

		// negative stayDays -> Math.max(stayDays, 0) => 0 so amounts should be 0 (rounded)
		await DataProviders.createInvoice(roomId, buildingId, -5, {}, createrId, roomVersion, redisKey);

		expect(Services.invoices.createInvoice).toHaveBeenCalled();
		const payload = Services.invoices.createInvoice.mock.calls[0][0];
		expect(payload.totalInvoiceAmount).toBe(0);
	});

	it('should treat string indices and amounts correctly (string inputs)', async () => {
		const feeIndexId = new mongoose.Types.ObjectId().toHexString();
		const roomFees = {
			feeInfo: [{ _id: feeIndexId, feeAmount: '2', feeName: 'Water', unit: 'index', feeKey: 'W' }],
			_id: { rent: '300' },
		};
		Services.fees.getRoomFeesAndDebts = jest.fn().mockResolvedValue(roomFees);
		Services.debts.getDebts = jest.fn().mockResolvedValue([]);
		Services.invoices.createInvoice = jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId().toHexString() });

		const feeIndexValues = {
			[feeIndexId]: { firstIndex: '2', secondIndex: '5' }, // (5-2)*2 = 6
		};

		await DataProviders.createInvoice(roomId, buildingId, 5, feeIndexValues, createrId, roomVersion, redisKey);

		const payload = Services.invoices.createInvoice.mock.calls[0][0];
		// rent: (300/30)*5 = 50
		// index: 6
		expect(payload.totalInvoiceAmount).toBe(56);
	});

	it('should set redis to FAILED and rethrow when an inner step throws (transaction safety)', async () => {
		Services.fees.getRoomFeesAndDebts = jest.fn().mockResolvedValue({ feeInfo: [], _id: { rent: 100 } });
		Services.debts.getDebts = jest.fn().mockResolvedValue([]);
		// Make assertRoomWritable throw
		const err = new Error('no permission');
		Services.rooms.assertRoomWritable = jest.fn().mockRejectedValue(err);

		await expect(DataProviders.createInvoice(roomId, buildingId, stayDays, {}, createrId, roomVersion, redisKey)).rejects.toThrow(
			'no permission',
		);

		expect(redis.set).toHaveBeenCalledWith(redisKey, expect.stringContaining('FAILED'), 'EX', process.env.REDIS_EXP_SEC);
		expect(session.endSession).toHaveBeenCalled();
	});
});
