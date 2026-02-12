const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BankAccountsSchema = new Schema(
	{
		bank: {
			type: Schema.Types.ObjectId,
			ref: 'BanksEntity',
			required: true,
		},
		building: {
			type: Schema.Types.ObjectId,
			ref: 'BuildingsEntity',
			required: true,
		},
		status: { type: String, enum: ['active', 'inactive'], default: 'active' },
		user: { type: Schema.Types.ObjectId, ref: 'UsersEntity', required: true },
		company: { type: Schema.Types.ObjectId },
		accountNumber: { type: String, required: true, trim: true, unique: true },
		accountName: { type: String, required: true },
		accumulated: { type: Number },
		label: { type: String },
		bankApiConnected: { type: Boolean, default: false },
		lastTransaction: { type: Date },
		version: { type: Number, default: 1 },
	},
	{
		timestamps: true,
	},
);

BankAccountsSchema.index({ building: 1 }, { unique: true });

exports.BankAccountsEntity = mongoose.model('BankAccountsEntity', BankAccountsSchema, 'bankAccounts');
