const { billType: BILL_TYPE } = require('../../constants/bills');
const Services = require('../../service');
const { sendZNS } = require('../../infrastructure/Zalo/ZNS/ZNS.service');
const { ZNSTemplateIds } = require('../../constants/Zalo');
const { transformInvoiceStatus } = require('../../constants/invoices');

const handleZNSNewInvoiceNotiJob = async (payload) => {
	try {
		const { billId, type } = payload;
		let znsData = {};
		if (type === BILL_TYPE['INVOICE']) {
			const invoice = await Services.invoices
				.findById(billId)
				.populate({
					path: 'room',
					select: 'roomIndex',
					populate: {
						path: 'building',
						select: 'buildingName',
					},
				})
				.populate({
					path: 'contract',
					populate: {
						path: 'customer',
						match: { isContractOwner: true },
						select: 'fullName phone',
					},
				})
				.populate({
					path: 'creater',
					select: 'fullName',
				})
				.lean()
				.exec();

			if (!invoice) throw new Error(`Invoice with id ${billId} not found`);

			console.log('log of invoice: ', invoice);

			znsData = {
				phone: invoice.contract.customer.phone,
				templateData: {
					customer_name: invoice.contract.customer.fullName,
					building_name: invoice.room.building.buildingName,
					room_index: invoice.room.roomIndex,
					bill_code: invoice.invoiceCode,
					status: transformInvoiceStatus[invoice.status],
					amount: invoice.total,
					sender_name: invoice.creater.fullName,
				},
			};
		} else {
			const receipt = await Services.receipts
				.findById(billId)
				.populate({
					path: 'room',
					select: 'roomIndex',
					populate: {
						path: 'building',
						select: 'buildingName',
					},
				})
				.populate({
					path: 'contract',
					populate: {
						path: 'customer',
						match: { isContractOwner: true },
						select: 'fullName phone',
					},
				})
				.populate({
					path: 'creater',
					select: 'fullName',
				})
				.lean()
				.exec();

			if (!receipt) throw new Error(`Receipt with id ${billId} not found`);

			znsData = {
				phone: receipt.contract.customer.phone,
				templateData: {
					customer_name: receipt.contract.customer.fullName,
					building_name: receipt.room.building.buildingName,
					room_index: receipt.room.roomIndex,
					bill_code: receipt.receiptCode,
					status: transformInvoiceStatus[receipt.status],
					amount: receipt.amount,
					sender_name: receipt.creater.fullName,
				},
			};
		}

		const result = await sendZNS({
			phone: znsData.phone,
			templateId: ZNSTemplateIds.NEW_INVOICE,
			templateData: znsData.templateData,
		});

		return {
			success: true,
			data: result,
		};
	} catch (error) {
		throw error;
	}
};

module.exports = { handleZNSNewInvoiceNotiJob };
