var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ROLES = require('../constants/userRoles');

const NotificationSettingsSchema = new Schema(
	{
		user: { type: Schema.Types.ObjectId, ref: 'UsersEntity' },
		paymentReceived: {
			// 1. Khách thanh toán hoặc có giao dịch
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: [ROLES['MANAGER'], ROLES['OWNER']], required: true, enum: [ROLES['MANAGER'], ROLES['OWNER']] },
		},
		staffTaskCompleted: {
			// 2. Nhân viên hoàn thành công việc
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: [ROLES['OWNER']], required: true, enum: [ROLES['OWNER']] },
		},
		roomCheckout: {
			// 3. Phòng trả phòng
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: [ROLES['OWNER'], ROLES['MANAGER']], required: true, enum: [ROLES['OWNER'], ROLES['MANAGER']] },
		},
		roomCheckoutEarly: {
			// 4. Phòng bỏ cọc
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: [ROLES['OWNER']], required: true, enum: [ROLES['OWNER']] },
		},
		cashCollected: {
			// 5. Nhân viên thu tiền mặt -> CHỈ OWNER
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: [ROLES['OWNER']], required: true, enum: [ROLES['OWNER']] },
		},
		assignedTask: {
			// 6. Nhận thông báo khi được giao việc
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: [ROLES['MANAGER']], required: true, enum: [ROLES['MANAGER']] },
		},
		contractExpiring: {
			// 7. Phòng sắp hết hạn hợp đồng
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: [ROLES['OWNER']], required: true, enum: [ROLES['OWNER']] },
		},
		roomDeposited: {
			// 8. Phòng được đặt cọc
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: [ROLES['OWNER'], ROLES['MANAGER']], required: true, enum: [ROLES['OWNER'], ROLES['MANAGER']] },
		},
	},
	{
		timestamps: true,
	},
);

exports.NotificationSettingsEntity = mongoose.model('NotificationSettingsEntity', NotificationSettingsSchema, 'notificationSettings');
