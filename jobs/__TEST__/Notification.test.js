jest.mock('../../service');

const Services = require('../../service');

const { handleNotiRoomDeposited } = require('../handleNotiRoomDeposited');

const ROLES = require('../../constants/userRoles');
const notiTypes = require('../../constants/notiTypes');

describe('handleNotiRoomDeposited', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should create and send notification successfully', async () => {
		const payload = {
			depositId: 'deposit_1',
		};

		const mockDepositInfo = {
			_id: 'deposit_1',
			rent: 3000000,
			depositAmount: 2000000,
			actualDepositAmount: 1000000,
			checkinDate: new Date(),

			room: {
				roomIndex: '101',
			},

			building: {
				buildingName: 'Building A',

				management: [
					{
						user: {
							_id: 'user_1',
							role: ROLES.MANAGER,
							expoPushToken: 'ExponentPushToken[manager]',
							notificationSetting: {
								[notiTypes.ROOM_DEPOSITED]: {
									enabled: true,
								},
							},
						},
					},

					{
						user: {
							_id: 'user_2',
							role: ROLES.OWNER,
							expoPushToken: 'ExponentPushToken[owner]',
							notificationSetting: {
								[notiTypes.ROOM_DEPOSITED]: {
									enabled: true,
								},
							},
						},
					},

					{
						user: {
							_id: 'user_3',
							role: ROLES.TENANT,
							expoPushToken: 'ExponentPushToken[tenant]',
						},
					},
				],
			},
		};

		const execMock = jest.fn().mockResolvedValue(mockDepositInfo);

		const leanMock = jest.fn(() => ({
			exec: execMock,
		}));

		const populateMock = jest.fn(() => ({
			populate: populateMock,
			lean: leanMock,
		}));

		Services.deposits.findById.mockReturnValue({
			populate: populateMock,
		});

		Services.notifications.createNotificationRoomDeposited.mockResolvedValue({
			_id: 'notification_1',
			title: 'Thông báo',
		});

		Services.notifications.sendNotification.mockResolvedValue({
			success: true,
		});

		const result = await handleNotiRoomDeposited(payload);

		expect(Services.deposits.findById).toHaveBeenCalledWith('deposit_1');

		expect(Services.notifications.createNotificationRoomDeposited).toHaveBeenCalled();

		expect(Services.notifications.sendNotification).toHaveBeenCalled();

		expect(result).toEqual({
			success: true,
			created: true,
			pushSent: true,
			notificationId: 'notification_1',
			totalReceivers: 2,
			pushSentTo: ['ExponentPushToken[manager]', 'ExponentPushToken[owner]'],
			result: {
				success: true,
			},
		});
	});

	it('should throw error when deposit not found', async () => {
		const execMock = jest.fn().mockResolvedValue(null);

		const leanMock = jest.fn(() => ({
			exec: execMock,
		}));

		const populateMock = jest.fn(() => ({
			populate: populateMock,
			lean: leanMock,
		}));

		Services.deposits.findById.mockReturnValue({
			populate: populateMock,
		});

		await expect(
			handleNotiRoomDeposited({
				depositId: 'invalid_id',
			}),
		).rejects.toThrow('Deposit not found');
	});
});
