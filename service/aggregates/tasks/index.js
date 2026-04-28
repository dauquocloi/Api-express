const dayjs = require('dayjs');

const getTasksWithQuery = (userObjectId, page, search, startDate, endDate, scope) => {
	console.log('log of getTasksWithQuery: ', userObjectId, page, search, startDate, endDate, scope);
	const pipeline = [];

	const userIdStr = userObjectId.toString();

	// =========================
	// 1. $search (KHI CÓ KEYWORD)
	// =========================

	if (search && search?.trim() !== '') {
		search = search.trim().replace(/\s+/g, ' ');

		const compound = {
			must: [
				{
					autocomplete: {
						query: search,
						path: 'taskContent',
					},
				},
			],
			should: [
				{
					autocomplete: {
						query: search,
						path: 'taskContent',
						score: { boost: { value: 3 } },
					},
				},
			],
		};

		// filter theo ngày (nếu có)
		if (dayjs(startDate).isValid() && dayjs(endDate).isValid()) {
			compound.filter = [
				{
					range: {
						path: 'executionDate',
						...(startDate && { gte: dayjs(startDate).startOf('day').toDate() }),
						...(endDate && { lte: dayjs(endDate).endOf('day').toDate() }),
					},
				},
			];
		}

		pipeline.push(
			{
				$search: {
					index: 'tasksIndex',
					compound,
				},
			},
			{
				$match: {
					managements: { $in: [userObjectId] },
				},
			},
		);
	} else {
		const match = {
			managements: { $in: [userObjectId] },
		};

		if (dayjs(startDate).isValid() && dayjs(endDate).isValid()) {
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
	// 2. PAGINATION THEO NGÀY
	// =========================

	pipeline.push({ $skip: (page - 1) * scope }, { $limit: scope + 1 });

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
				pipeline: [{ $project: { _id: 1, fullName: 1, avatar: 1, gender: 1 } }],
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
	// 5. FORMAT
	// =========================
	pipeline.push(
		{
			$addFields: {
				_id: {
					$dateToString: {
						format: '%Y-%m-%d',
						date: '$createdAt',
						timezone: '+07:00',
					},
				},
				data: ['$$ROOT'],
			},
		},
		{
			$project: {
				_id: 1,
				data: 1,
			},
		},
	);

	return pipeline;
};

const getTasks = (userObjectId, page, daysPerPage, startDate, endDate) => {
	return [
		{
			$match: {
				managements: {
					$in: [userObjectId],
				},
				...(dayjs(startDate).isValid() && dayjs(endDate).isValid()
					? {
							executionDate: {
								...(startDate && {
									$gte: dayjs(startDate).startOf('day').toDate(),
								}),
								...(endDate && {
									$lte: dayjs(endDate).endOf('day').toDate(),
								}),
							},
					  }
					: {}),
			},
		},

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
				pipeline: [{ $project: { _id: 1, fullName: 1, avatar: 1, gender: 1 } }],
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
				detail: 1,
				createdAt: 1,
				updatedAt: 1,
				executionDate: 1,
			},
		},
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
		{ $skip: (page - 1) * daysPerPage },
		{ $limit: daysPerPage + 1 },
	];
};

module.exports = { getTasks, getTasksWithQuery };
