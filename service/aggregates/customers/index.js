const mongoose = require('mongoose');
const { CUSTOMER_STATUS } = require('../../../constants');

const getAllCustomers = (buildingId, status) => {
	return [
		{
			$match: {
				_id: new mongoose.Types.ObjectId(buildingId),
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: '_id',
				foreignField: 'building',
				pipeline: [
					{
						$lookup: {
							from: 'customers',
							localField: '_id',
							foreignField: 'room',
							pipeline: [
								{
									$match: {
										status: {
											$in:
												status === 'leaved'
													? [CUSTOMER_STATUS['TERMINATED']]
													: [CUSTOMER_STATUS['ACTIVE'], CUSTOMER_STATUS['SUSPENDED']],
										},
									},
								},
								{
									$lookup: {
										from: 'vehicles',
										localField: '_id',
										foreignField: 'owner',
										as: 'vehicles',
									},
								},
							],
							as: 'customers',
						},
					},
					{
						$sort: {
							roomIndex: 1,
						},
					},
					{
						$project: {
							_id: 0,
							roomId: '$_id',
							roomIndex: 1,
							roomState: 1,
							customerInfo: '$customers',
						},
					},
				],
				as: 'rooms',
			},
		},
	];
};

module.exports = { getAllCustomers };
