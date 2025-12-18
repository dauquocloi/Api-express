const getTasks = (userObjectId, page, daysPerPage, search, startDate, endDate) => {
	let matchQuery = {};
	if (search) {
		search.trim().replace(/\s+/g, ' ');
	}
	if (search && search.trim() !== '') {
		matchQuery.$search = {
			index: 'default',
			compound: {
				must: [
					{
						text: {
							query: search,
							path: ['taskContent', 'detail'],
						},
					},
					{
						equals: {
							path: 'managements',
							value: userObjectId,
						},
					},
				],
			},
		};
	} else {
		matchQuery.$match = {
			managements: { $eq: userObjectId },
		};
	}

	// Tìm kiếm theo matchQuery
	// if (queryStatus) matchQuery.$and = [queryStatus];

	// Tìm kiếm theo ngày
	if (startDate || endDate) {
		matchQuery.executionDate = {};

		if (startDate) {
			const start = new Date(startDate);
			start.setHours(0, 0, 0, 0); // bắt đầu từ 00:00:00
			matchQuery.executionDate.$gte = start;
		}

		if (endDate) {
			const end = new Date(data.endDate);
			end.setHours(23, 59, 59, 999); // hết ngày 23:59:59
			matchQuery.executionDate.$lte = end;
		}
	}

	return [
		matchQuery,
		{
			$lookup: {
				from: 'users',
				localField: 'managements',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							fullName: 1,
							avatar: 1,
						},
					},
				],
				as: 'managements',
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'performers',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							fullName: 1,
							avatar: 1,
						},
					},
				],
				as: 'performers',
			},
		},
		{
			$project: {
				_id: 1,
				status: 1,
				performers: 1,
				managements: 1,
				taskContent: 1,
				createdAt: 1,
				updatedAt: 1,
				executionDate: 1,
			},
		},

		{
			$sort: {
				createdAt: -1,
			},
		},
		{
			$group: {
				_id: {
					$dateToString: {
						format: '%Y-%m-%d',
						date: '$createdAt',
						timezone: '+07:00',
					},
				},
				data: {
					$push: '$$ROOT',
				},
			},
		},
		{
			$sort: {
				_id: -1,
			},
		},

		// Phân trang theo ngày
		{ $skip: (page - 1) * daysPerPage },
		{ $limit: daysPerPage + 1 },
	];
};

module.exports = { getTasks };
