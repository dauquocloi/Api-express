module.exports = function getCheckoutCostsPipeline(buildingId, month, year) {
	return [
		{
			$match: {
				buildingId: buildingId,
				month: Number(month),
				year: Number(year),
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: 'roomId',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							roomIndex: 1,
						},
					},
				],
				as: 'room',
			},
		},
		{
			$lookup: {
				from: 'receipts',
				localField: 'checkoutCostReceipt',
				foreignField: '_id',
				as: 'receipt',
			},
		},
		{
			$project: {
				_id: 1,
				room: {
					$first: '$room',
				},
				total: 1,
				status: {
					$ifNull: [
						{
							$first: '$receipt.status',
						},
						null,
					],
				},
			},
		},
	];
};
