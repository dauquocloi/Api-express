const { date } = require('joi');
var mongoose = require('mongoose');
// (Schema = mongoose.Schema), (ObjectId = Schema.ObjectId);
require('mongoose-double')(mongoose);

const Schema = mongoose.Schema;
// Create a Mongoose Schema

const RoomStatisticsSchema = new Schema({
	totalRoom: {
		type: Number,
		min: 0,
	},
	rentedRoom: {
		type: Number,
		min: 0,
	},
	emptyRoom: {
		type: Number,
		min: 0,
	},
	occupancyRate: {
		type: Number,
		min: 0,
		max: 100,
	},
	occupancyComparisonRate: {
		type: Number,
		default: null,
	},
	// occupancyComparisonTrend: { type: String, enum: ['increase', 'decrease', 'stable'], required: true },
});

const VehicleStatisticSchema = new Schema({
	totalVehicle: {
		type: Number,
		min: 0,
	},
	vehicleComparisonRate: {
		type: Number,
	},
	// vehicleComparisonTrend: { type: String, enum: ['increase', 'decrease', 'stable'], required: true },
});

const CustomerStatisticsSchema = new Schema({
	temporaryResidentTotal: {
		type: Number,
		min: 0,
	},
	totalCustomer: {
		type: Number,
		min: 0,
	},
	customerComparisonRate: {
		type: Number,
	},
	// customerComparisonTrend: { type: String, enum: ['increase', 'decrease', 'stable'], required: true },
});

let StatisticsSchema = new Schema(
	{
		statisticsStatus: {
			type: String,
			enum: {
				values: ['lock', 'unLock'],
			},
			required: true,
		},
		building: {
			type: Schema.Types.ObjectId,
			ref: 'BuildingsEntity',
		},
		month: {
			type: Number,
			required: true,
			min: [1, 'month must be at least 1'],
			max: [12, 'month cannot exceed 30'],
			validate: {
				validator: Number.isInteger,
				message: 'month must be an integer',
			},
		}, // Tháng (1 - 12)
		year: {
			type: Number,
			required: true,
			validate: {
				validator: Number.isInteger,
				message: 'years must be an integer',
			},
		}, // Năm
		revenue: {
			type: Number,
			required: true,
		},
		revenueComparisonRate: {
			type: Number,
			default: null,
		},
		expenditure: {
			type: Number,
			required: true,
		},
		expenditureComparitionRate: {
			type: Number,
			default: null,
		},
		profit: {
			type: Number,
			required: true,
		},
		profitComparisonRate: {
			type: Number,
			default: null,
		},
		// profitComparisonTrend: { type: String, enum: ['increase', 'decrease', 'stable'] },
		room: RoomStatisticsSchema,
		vehicle: VehicleStatisticSchema,
		customer: CustomerStatisticsSchema,
	},

	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

// Register the room schema
exports.StatisticsEntity = mongoose.model('StatisticsEntity', StatisticsSchema, 'statistics');
