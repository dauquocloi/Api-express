const getAllRevenues = (buildingId, month, year) => {
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
									{
										$not: {
											$in: ['$status', ['terminated', 'pending']],
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
								$cond: [
									{
										$eq: ['$receiptType', 'deposit'],
									},
									//then
									{
										$and: [
											{
												$eq: ['$room', '$$roomId'],
											},
											{
												$lt: ['$carriedOverPaidAmount', '$amount'],
											},
										],
									},
									//else
									{
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
												$in: ['$status', ['paid', 'partial', 'unpaid']],
											},
										],
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
			$lookup: {
				from: 'transactions',
				let: {
					receiptId: {
						$map: {
							input: '$receiptInfo',
							as: 'r',
							in: '$$r._id',
						},
					},
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: ['$receipt', '$$receiptId'],
							},
						},
					},
				],
				as: 'transactionReceipt',
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
				receiptInfo: {
					$map: {
						input: '$receiptInfo',
						as: 'r',
						in: {
							_id: '$$r._id',
							amount: '$$r.amount',
							status: '$$r.status',
							receiptContent: '$$r.receiptContent',
							receiptContentDetail: '$$r.receiptContentDetail',
							receiptType: '$$r.receiptType',
							paidAmount: '$$r.paidAmount',
							carriedOverPaidAmount: '$$r.carriedOverPaidAmount',
							transactionReceipt: {
								$map: {
									input: {
										$filter: {
											input: '$transactionReceipt',
											as: 'tr',
											cond: {
												$eq: ['$$tr.receipt', '$$r._id'],
											},
										},
									},
									as: 'tr',
									in: {
										_id: '$$tr._id',
										amount: '$$tr.amount',
										receipt: '$$tr.receipt',
										month: '$$tr.month',
										year: '$$tr.year',
										paymentMethod: '$$tr.paymentMethod',
									},
								},
							},
						},
					},
				},
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
			$project:
				/**
				 * specifications: The fields to
				 *   include or exclude.
				 */
				{
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
