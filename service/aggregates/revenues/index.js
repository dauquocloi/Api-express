const mongoose = require('mongoose');
const { receiptStatus, invoiceStatus, OWNER_CONFIRMED_STATUS, receiptTypes } = require('../../../constants');

const getAllRevenues = (buildingId, month, year) => {
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
				as: 'rooms',
			},
		},
		{
			$unwind: {
				path: '$rooms',
			},
		},
		{
			$lookup: {
				from: 'invoices',
				let: {
					roomId: '$rooms._id',
					month: month,
					year: year,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$room', '$$roomId'],
									},
									{
										$eq: ['$month', '$$month'],
									},
									{
										$eq: ['$year', '$$year'],
									},
									{
										$not: {
											$in: ['$status', [invoiceStatus['TERMINATED'], invoiceStatus['PENDING']]],
										},
									},
								],
							},
						},
					},
				],
				as: 'invoiceInfo',
			},
		},

		{
			$lookup: {
				from: 'receipts',
				let: {
					roomId: '$rooms._id',
					month: month,
					year: year,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										// Ta lấy riêng các receipt deposit ở pipeline thứ 2.
										$ne: ['$receiptType', receiptTypes['DEPOSIT']],
									},
									{
										$eq: ['$room', '$$roomId'],
									},
									{
										$eq: ['$month', '$$month'],
									},
									{
										$eq: ['$year', '$$year'],
									},
									{
										$in: ['$status', [receiptStatus['PAID'], receiptStatus['PARTIAL'], receiptStatus['UNPAID']]],
									},
								],
							},
						},
					},
				],
				as: 'receiptInfo',
			},
		},
		{
			$project: {
				_id: 1,
				buildingName: 1,
				roomInfo: {
					_id: '$rooms._id',
					roomIndex: '$rooms.roomIndex',
					roomState: '$rooms.roomState',
				},
				invoiceInfo: {
					$map: {
						input: '$invoiceInfo',
						as: 'invoiceInfo',
						in: {
							_id: '$$invoiceInfo._id',
							total: '$$invoiceInfo.total',
							paidAmount: '$$invoiceInfo.paidAmount',
							status: '$$invoiceInfo.status',
							fee: '$$invoiceInfo.fee',
							debts: '$$invoiceInfo.debts',
							detuctedInfo: '$$invoiceInfo.detuctedInfo',
						},
					},
				},

				receiptInfo: 1,
			},
		},
		{
			$group: {
				_id: '$_id',
				revenues: {
					$push: {
						roomId: '$roomInfo._id',
						roomIndex: '$roomInfo.roomIndex',
						roomState: '$roomInfo.roomState',
						invoiceInfo: '$invoiceInfo',
						receiptInfo: '$receiptInfo',
					},
				},
			},
		},
		{
			$lookup: {
				from: 'incidentalRevenues',
				let: {
					buildingId: '$_id',
					month: month,
					year: year,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$$buildingId', '$building'],
									},
									{
										$eq: ['$$month', '$month'],
									},
									{
										$eq: ['$$year', '$year'],
									},
								],
							},
						},
					},
				],
				as: 'otherRevenues',
			},
		},

		{
			$lookup: {
				from: 'users',
				localField: 'otherRevenues.collector',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							fullName: 1,
						},
					},
				],
				as: 'collector',
			},
		},
		{
			$addFields: {
				otherRevenues: {
					$map: {
						input: '$otherRevenues',
						as: 'or',
						in: {
							$mergeObjects: [
								'$$or',
								{
									collector: {
										$first: {
											$filter: {
												input: '$collector',
												as: 'c',
												cond: {
													$eq: ['$$c._id', '$$or.collector'],
												},
											},
										},
									},
								},
							],
						},
					},
				},
			},
		},
		{
			$project: {
				_id: 1,
				revenues: 1,
				otherRevenues: 1,
			},
		},
	];
};

const getFeeRevenueDetail = (buildingId, month, year) => {
	return [
		{
			$match: {
				_id: buildingId,
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: '_id',
				foreignField: 'building',
				as: 'rooms',
			},
		},
		{
			$unwind: {
				path: '$rooms',
			},
		},
		{
			$lookup: {
				from: 'invoices',
				let: {
					roomId: '$rooms._id',
					month: month,
					year: year,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$room', '$$roomId'],
									},
									{
										$eq: ['$month', '$$month'],
									},
									{
										$eq: ['$year', '$$year'],
									},
								],
							},
						},
					},
				],
				as: 'invoice',
			},
		},
		{
			$unwind: {
				path: '$invoice',
			},
		},
		{
			$lookup: {
				from: 'transactions',
				let: {
					invoiceId: '$invoice._id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$invoice', '$$invoiceId'],
							},
						},
					},
				],
				as: 'transactions',
			},
		},
		{
			$project: {
				_id: 1,
				room: {
					_id: '$rooms._id',
					roomIndex: '$rooms.roomIndex',
					roomState: '$rooms.roomState',
				},
				invoice: 1,
				transactions: 1,
			},
		},
		{
			$group: {
				_id: '$_id',
				feeRevenueInfo: {
					$push: {
						_id: '$room._id',
						roomIndex: '$room.roomIndex',
						roomState: '$room.roomState',
						invoice: '$invoice',
						transaction: '$transactions',
					},
				},
			},
		},
	];
};

module.exports = { getAllRevenues, getFeeRevenueDetail };
