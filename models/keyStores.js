const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const KeyStoresSchema = new Schema(
	{
		user: { type: Schema.Types.ObjectId, ref: 'users' },
		primaryKey: {
			type: Schema.Types.String,
			required: true,
			trim: true,
		},
		secondaryKey: {
			type: Schema.Types.String,
			required: true,
			trim: true,
		},
		status: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

KeyStoresSchema.index({ user: 1 });
KeyStoresSchema.index({ user: 1, primaryKey: 1, status: 1 });
KeyStoresSchema.index({ user: 1, primaryKey: 1, secondaryKey: 1 });

exports.KeyStoresEntity = mongoose.model('KeyStoresEntity', KeyStoresSchema, 'keyStores');
