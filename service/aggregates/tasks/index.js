const getTasks = (userObjectId, page, daysPerPage, search, startDate, endDate) => {
	console.log('log of getTasks: ', daysPerPage, page);
	const pipeline = [];

	const userIdStr = userObjectId.toString();

	// =========================
	// 1. $search (KHI CÓ KEYWORD)
	// =========================
	if (search && search.trim()) {
		search = search.trim().replace(/\s+/g, ' ');

		const compound = {
			should: [
				{
					autocomplete: {
						query: search,
						path: 'taskContent',
					},
				},
				{
					autocomplete: {
						query: search,
						path: 'detail',
					},
				},
			],
			minimumShouldMatch: 1,
		};

		// filter theo ngày (nếu có)
		if (startDate || endDate) {
			compound.filter = [
				{
					range: {
						path: 'executionDate',
						...(startDate && { gte: new Date(startDate) }),
						...(endDate && { lte: new Date(endDate) }),
					},
				},
			];
		}

		pipeline.push(
			{
				$search: {
					index: 'default',
					compound,
				},
			},
			{
				$match: {
					managements: { $in: [userObjectId] },
				},
			},
		);
	}

	// =========================
	// 2. $match (KHI KHÔNG SEARCH)
	// =========================
	else {
		const match = {
			managements: { $in: [userObjectId] },
		};

		if (startDate || endDate) {
			match.executionDate = {};

			if (startDate) {
				const start = new Date(startDate);
				start.setHours(0, 0, 0, 0);
				match.executionDate.$gte = start;
			}

			if (endDate) {
				const end = new Date(endDate);
				end.setHours(23, 59, 59, 999);
				match.executionDate.$lte = end;
			}
		}

		pipeline.push({ $match: match });
	}

	// =========================
	// 3. LOOKUP USERS
	// =========================
	pipeline.push(
		{
			$lookup: {
				from: 'users',
				localField: 'managements',
				foreignField: '_id',
				pipeline: [{ $project: { _id: 1, fullName: 1, avatar: 1 } }],
				as: 'managements',
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'performers',
				foreignField: '_id',
				pipeline: [{ $project: { _id: 1, fullName: 1, avatar: 1 } }],
				as: 'performers',
			},
		},
	);

	// =========================
	// 4. PROJECT
	// =========================
	pipeline.push({
		$project: {
			_id: 1,
			status: 1,
			performers: 1,
			managements: 1,
			taskContent: 1,
			detail: 1,
			createdAt: 1,
			updatedAt: 1,
			executionDate: 1,
		},
	});

	// =========================
	// 5. SORT + GROUP THEO NGÀY
	// =========================
	pipeline.push(
		{ $sort: { createdAt: -1 } },
		{
			$group: {
				_id: {
					$dateToString: {
						format: '%Y-%m-%d',
						date: '$createdAt',
						timezone: '+07:00',
					},
				},
				data: { $push: '$$ROOT' },
			},
		},
		{ $sort: { _id: -1 } },
	);

	// =========================
	// 6. PAGINATION THEO NGÀY
	// =========================
	pipeline.push({ $skip: (page - 1) * daysPerPage }, { $limit: daysPerPage + 1 });

	return pipeline;
};

module.exports = { getTasks };
