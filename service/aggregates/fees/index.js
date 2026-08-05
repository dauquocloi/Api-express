const mongoose = require('mongoose');
const { contractStatus, vehicleStatus, CUSTOMER_STATUS, debtStatus } = require('../../../constants');

const getRoomFeesAndDebts = (roomObjectId) => {
	return [
		{
			$match: {
				_id: new mongoose.Types.ObjectId(roomObjectId),
			},
		},
		{
			$lookup: {
				from: 'fees',
				localField: '_id',
				foreignField: 'room',
				as: 'feeInfo',
			},
		},
		{
			$lookup: {
				from: 'contracts',
				localField: '_id',
				foreignField: 'room',
				pipeline: [
					{
						$match: {
							status: contractStatus['ACTIVE'],
						},
					},
					{
						$set: {
							versions: {
								$ifNull: [
									{
										$first: {
											$sortArray: {
												input: '$versions',
												sortBy: {
													version: -1,
												},
											},
										},
									},
									null,
								],
							},
						},
					},
				],
				as: 'contractInfo',
			},
		},
		{
			$set: {
				contractInfo: {
					$ifNull: [
						{
							$first: '$contractInfo',
						},
						null,
					],
				},
			},
		},
		{
			$unwind: {
				path: '$feeInfo',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				shouldLookupPerson: {
					$eq: ['$feeInfo.unit', 'person'],
				},
				shouldLookupVehicle: {
					$eq: ['$feeInfo.unit', 'vehicle'],
				},
			},
		},
		{
			$lookup: {
				from: 'customers',
				localField: 'contractInfo._id',
				foreignField: 'contract',
				as: 'customerInfo',
				let: {
					shouldLookup: '$shouldLookupPerson',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$$shouldLookup', true],
									},
									{
										$not: {
											$in: ['$status', [CUSTOMER_STATUS['TERMINATED'], CUSTOMER_STATUS['SUSPENDED']]],
										},
									},
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
							isContractOwner: 1,
							fullName: 1,
						},
					},
				],
			},
		},
		{
			$lookup: {
				from: 'vehicles',
				localField: 'contractInfo._id',
				foreignField: 'contract',
				as: 'vehicleInfo',
				let: {
					shouldLookup: '$shouldLookupVehicle',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$$shouldLookup', true],
									},
									{
										$not: {
											$in: ['$status', [vehicleStatus['TERMINATED'], vehicleStatus['SUSPENDED']]],
										},
									},
								],
							},
						},
					},
				],
			},
		},
		{
			$lookup: {
				from: 'debts',
				localField: '_id',
				foreignField: 'room',
				as: 'debtsInfo',
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$status', debtStatus['PENDING']],
							},
						},
					},
				],
			},
		},
		{
			$project: {
				_id: 1,
				roomIndex: 1,
				roomState: 1,
				feeInfo: 1,
				debtsInfo: 1,
				customerInfo: 1,
				vehicleInfo: 1,
				rent: '$contractInfo.versions.rent',
			},
		},
		{
			$group: {
				_id: {
					_id: '$_id',
					roomIndex: '$roomIndex',
					roomState: '$roomState',
					rent: '$rent',
					debtsInfo: '$debtsInfo',
				},
				feeInfo: {
					$push: {
						_id: '$feeInfo._id',
						feeName: '$feeInfo.feeName',
						unit: '$feeInfo.unit',
						feeAmount: '$feeInfo.feeAmount',
						feeKey: '$feeInfo.feeKey',
						customerInfo: {
							$cond: {
								if: {
									$eq: ['$feeInfo.unit', 'person'],
								},
								then: '$customerInfo',
								else: null,
							},
						},
						vehicleInfo: {
							$cond: {
								if: {
									$eq: ['$feeInfo.unit', 'vehicle'],
								},
								then: '$vehicleInfo',
								else: null,
							},
						},
						lastIndex: '$feeInfo.lastIndex',
					},
				},
			},
		},
	];
};

module.exports = { getRoomFeesAndDebts };
