const Services = require('../service');

//Check ngữ cảnh (Context): User x có quyền trên resource này không ?

const resourceOwnershipPolicy = {
	invoices: {
		resolveBuildingId: async (invoiceId) => {
			const invoice = await Services.invoices.findById(invoiceId);
			if (!invoice) return null;
			return invoice.buildingId;
		},
	},

	receipts: {
		resolveBuildingId: async (receiptId) => {
			const receipt = await Services.receipts.findById(receiptId).populate({ path: 'room', select: 'building' }).lean().exec();
			if (!receipt) return null;
			return receipt.building;
		},
	},

	rooms: {
		resolveBuildingId: async (roomId) => {
			const room = await Services.rooms.findById(roomId);
			if (!room) return null;
			return room.building;
		},
	},

	//deposits,
	//vehicles,
	//customers,
	//notificationss,
	//transactions,
	//contracts,
	//...
};

module.exports = resourceOwnershipPolicy;
