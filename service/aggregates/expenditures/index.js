const getExpenditures = (buildingId, month, year) => {
	return [
		{
			$match: {
				_id: buildingId,
			},
		},
		{
			$lookup: {
				from: 'periodicExpenditures',
				localField: '_id',
				foreignField: 'building',
				as: 'periodicExpenditures',
			},
		},
		{
			$lookup: {
				from: 'expenditures',
				let: {
					buildingId: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$building', '$$buildingId'],
									},
									{
										$eq: ['$type', 'incidental'],
									},
									{
										$eq: ['$month', month],
									},
									{
										$eq: ['$year', year],
									},
								],
							},
						},
					},
				],
				as: 'incidentalExpenditures',
			},
		},
		{
			$project: {
				periodicExpenditures: 1,
				incidentalExpenditures: 1,
			},
		},
	];
};

module.exports = { getExpenditures };
