const getNotifications = (receiverObjectId, pages, limit) => {
	return [
		{ $match: { receivers: receiverObjectId } },
		{ $sort: { createdAt: -1 } },
		{
			$addFields: {
				date: {
					$dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
				},
			},
		},
		{
			$group: {
				_id: '$date',
				notifications: { $push: '$$ROOT' },
			},
		},
		{ $sort: { _id: -1 } },
		{ $skip: (pages - 1) * limit },
		{ $limit: limit + 1 },
	];
};

module.exports = { getNotifications };
