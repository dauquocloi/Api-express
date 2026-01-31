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

const getExpendituresStatusLocked = (buildingObjectId, month, year) => {
	return [
		{
			$match: {
				_id: buildingObjectId,
			},
		},
		{
			$lookup: {
				from: 'expenditures',
				localField: '_id',
				foreignField: 'building',
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
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
				as: 'expenditures',
			},
		},
	];
};

module.exports = { getExpenditures, getExpendituresStatusLocked };
