const { required } = require('joi');
var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSettingsSchema = new Schema(
	{
		user: { type: Schema.Types.ObjectId, ref: 'users' },
		paymentReceived: {
			// 1. Khách thanh toán hoặc có giao dịch
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: ['owner', 'manager'], required: true, enum: ['owner', 'manager'] },
		},
		staffTaskCompleted: {
			// 2. Nhân viên hoàn thành công việc
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: ['owner'], required: true, enum: ['owner'] },
		},
		roomCheckout: {
			// 3. Phòng trả phòng
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: ['owner', 'manager'], required: true, enum: ['owner', 'manager'] },
		},
		roomCheckoutEarly: {
			// 4. Phòng bỏ cọc
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: ['owner'], required: true, enum: ['owner'] },
		},
		cashCollected: {
			// 5. Nhân viên thu tiền mặt -> CHỈ OWNER
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: ['owner'], required: true, enum: ['owner'] },
		},
		assignedTask: {
			// 6. Nhận thông báo khi được giao việc
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: ['manager'], required: true, enum: ['manager'] },
		},
		contractExpiring: {
			// 7. Phòng sắp hết hạn hợp đồng
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: ['owner'], required: true, enum: ['owner'] },
		},
		roomDeposited: {
			// 8. Phòng được đặt cọc
			enabled: { type: Boolean, default: true },
			allowedRoles: { type: [String], default: ['owner', 'manager'], required: true, enum: ['owner', 'manager'] },
		},
	},
	{
		timestamps: true,
	},
);

exports.NotificationSettingsSchema = mongoose.model('NotificationSettingsSchema', NotificationSettingsSchema, 'notificationSettings');
