const getRoomFeesAndDebts = (roomObjectId) => {
	return [
		{
			$match: {
				_id: roomObjectId,
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
							status: 'active',
						},
					},
				],
				as: 'contractInfo',
			},
		},
		{
			$unwind: {
				path: '$contractInfo',
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
											$in: ['$status', [0, 2]],
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
											$in: ['$status', ['terminated', 'suspended']],
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
								$eq: ['$status', 'pending'],
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
				rent: '$contractInfo.rent',
				version: 1,
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
					version: '$version',
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
