// var mongoose = require('mongoose');
// const Entity = require('./index');
// const Schema = mongoose.Schema;

// // Owner only
// // const PermissionsSchema = new Schema(
// // 	{
// // 		managerCollectCash: { type: Boolean, default: true },
// // 		managerEditRoomFee: { type: Boolean, default: true },
// // 		managerEditInvoice: { type: Boolean, default: true },
// // 		managerDeleteInvoice: { type: Boolean, default: true },
// // 		managerAddExpenditure: { type: Boolean, default: true },
// // 		managerAddIncidentalIncome: { type: Boolean, default: true },
// // 	},
// // 	{ _id: false },
// // );

// const SettingsSchema = new Schema(
// 	{
// 		user: { type: Schema.Types.ObjectId, ref: 'users' },
// 		notifications: { type: NotificationSettingSchema },
// 		permissions: { type: PermissionsSchema },
// 	},
// 	{
// 		timestamps: true,
// 	},
// );

// exports.SettingsEntity = mongoose.model('SettingsEntity', SettingsSchema, 'settings');
