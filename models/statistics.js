const { date } = require('joi');
var mongoose = require('mongoose');
// (Schema = mongoose.Schema), (ObjectId = Schema.ObjectId);
require('mongoose-double')(mongoose);

const Schema = mongoose.Schema;
// Create a Mongoose Schema

let RoomStatisticsSchema = new Schema({
	totalRoomCount: {
		type: Number,
		min: 0,
	},
	rentedRoomCount: {
		type: Number,
		min: 0,
	},
	emptyRoomCount: {
		type: Number,
		min: 0,
	},
	occupancyRate: {
		type: Number,
		required: true,
		min: 0,
		max: 100,
	},
	occupancyComparisonRate: {
		type: Number,
		min: 0,
		max: 100,
	},
	occupancyComparisonTrend: { type: String, enum: ['increase', 'decrease', 'stable'], required: true },
});

const VehicleStatisticSchema = new Schema({
	totalVehicleCount: {
		type: Number,
		min: 0,
	},
	vehicleComparisonRate: {
		type: Number,
		min: 0,
		max: 100,
	},
	vehicleComparisonTrend: { type: String, enum: ['increase', 'decrease', 'stable'], required: true },
});

const CustomerStatisticsSchema = new Schema({
	temporaryResidentTotalCount: {
		type: Number,
		min: 0,
	},
	totalCustomerCount: {
		type: Number,
		min: 0,
	},
	customerComparisonRate: {
		type: Number,
		min: 0,
		max: 100,
	},
	customerComparisonTrend: { type: String, enum: ['increase', 'decrease', 'stable'], required: true },
});

let StatisticsSchema = new Schema(
	{
		statisticsStatus: {
			type: String,
			enum: {
				values: ['lock', 'unLock'],
				message: '{VALUE} is not a valid invoice type',
			},
			required: true,
		},
		building: {
			type: Schema.Types.ObjectId,
			ref: 'buildings',
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
			type: Schema.Types.ObjectId,
			ref: 'revenue',
		},
		expenditure: {
			type: Schema.Types.ObjectId,
			ref: 'expenditures',
		},
		profit: {
			type: Number,
			required: true,
		},
		profitComparisonRate: {
			type: Number,
			min: 0,
		},
		profitComparisonTrend: { type: String, enum: ['increase', 'decrease', 'stable'], required: true },
		room: { RoomStatisticsSchema },
		vehicle: { VehicleStatisticSchema },
		customer: { CustomerStatisticsSchema },
	},

	{
		versionKey: false,
		collation: { locale: 'vi' },
		timestamps: true, // Thêm thời gian tạo và cập nhật
	},
);

// Register the room schema
exports.StatisticsEntity = mongoose.model('StatisticsEntity', StatisticsSchema, 'statistics');
