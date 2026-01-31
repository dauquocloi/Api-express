const Services = require('../service');

const resourceOwnershipPolicy = {
	buildings: {
		resolveBuildingId: async (buildingId) => {
			const building = await Services.buildings.findById(buildingId).lean().exec();
			if (!building) return null;
			return building._id;
		},
	},

	invoices: {
		resolveBuildingId: async (invoiceId) => {
			const invoice = await Services.invoices.findById(invoiceId).populate({ path: 'room', select: 'building' }).lean().exec();
			if (!invoice || !invoice.room) return null;
			return invoice.room.building;
		},
	},

	receipts: {
		resolveBuildingId: async (receiptId) => {
			const receipt = await Services.receipts.findById(receiptId).populate({ path: 'room', select: 'building' }).lean().exec();
			if (!receipt || !receipt.room) return null;
			return receipt.room.building;
		},
	},

	rooms: {
		resolveBuildingId: async (roomId) => {
			const room = await Services.rooms.findById(roomId);
			if (!room || !room.building) return null;
			return room.building;
		},
	},

	deposits: {
		resolveBuildingId: async (depositId) => {
			const deposit = await Services.deposits.findById(depositId).populate({ path: 'room', select: 'building' }).lean().exec();
			if (!deposit || !deposit.room) return null;
			return deposit.room.building;
		},
	},

	vehicles: {
		resolveBuildingId: async (vehicleId) => {
			const vehicle = await Services.vehicles.findById(vehicleId).populate({ path: 'room', select: 'building' }).lean().exec();
			if (!vehicle || !vehicle.room) return null;
			return vehicle.room.building;
		},
	},

	customers: {
		resolveBuildingId: async (customerId) => {
			const customer = await Services.customers.findById(customerId).populate({ path: 'room', select: 'building' }).lean().exec();
			if (!customer || !customer.room) return null;
			return customer.room.building;
		},
	},

	contracts: {
		resolveBuildingId: async (contractId) => {
			const contract = await Services.contracts.findById(contractId).populate({ path: 'room', select: 'building' }).lean().exec();
			if (!contract || !contract.room) return null;
			return contract.room.building;
		},
	},

	depositRefunds: {
		resolveBuildingId: async (depositRefundId) => {
			const depositRefund = await Services.depositRefunds
				.findById(depositRefundId)
				.populate({ path: 'room', select: 'building' })
				.lean()
				.exec();
			if (!depositRefund || !depositRefund.room) return null;
			return depositRefund.room.building;
		},
	},

	expenditures: {
		resolveBuildingId: async (expenditureId) => {
			const expenditure = await Services.expenditures.findById(expenditureId).populate('building').lean().exec();
			if (!expenditure || !expenditure.building) return null;
			return expenditure.building._id;
		},
	},

	fees: {
		resolveBuildingId: async (feeId) => {
			const fee = await Services.fees.findById(feeId).populate({ path: 'room', select: 'building' }).lean().exec();
			if (!fee || !fee.room) return null;
			return fee.room.building;
		},
	},

	incidentalRevenues: {
		resolveBuildingId: async (incidentalRevenueId) => {
			const incidentalRevenue = await Services.revenues.findIncidentalRevenueById(incidentalRevenueId).lean().exec();
			if (!incidentalRevenue || !incidentalRevenue.building) return null;
			return incidentalRevenue.building;
		},
	},

	transactions: {
		resolveBuildingId: async (transactionId) => {
			const transaction = await Services.transactions
				.findById(transactionId)
				.populate({ path: 'invoice', populate: { path: 'room', select: 'building' } })
				.populate({ path: 'receipt', populate: { path: 'room', select: 'building' } })
				.lean()
				.exec();

			if (!transaction) return null;

			const buildingId = transaction.invoice?.room?.building || transaction.receipt?.room?.building;

			return buildingId || null;
		},
	},
	//notificationss,
	//transactions,
	//...
};

module.exports = resourceOwnershipPolicy;
