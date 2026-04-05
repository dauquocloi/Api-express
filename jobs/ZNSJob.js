const BaseJob = require('./BaseJob');
const Services = require('../service');
const Sentry = require('@sentry/node');
const { providers } = require('../constants/OA');
const { ZNSTemplateIds } = require('../constants/Zalo');
const { sendZNS } = require('../infrastructure/Zalo/ZNS/ZNS.service');
const { transformInvoiceStatus } = require('../constants/invoices');
const { billType } = require('../constants/bills');

class ZNSNewInvoiceNotiJob extends BaseJob {
	constructor() {
		super('zns-new-invoice-noti-job');
	}

	async handle(payload) {
		const { billId, type } = payload;
		let znsData = {};
		if (type === billType['INVOICE']) {
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
	}

	async onFailed(job, error) {
		console.error(`[zns-new-invoice-noti-job] Job failed #${job.id}`, {
			error: error.message,
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			attemptsRemaining: job.opts.attempts - job.attemptsMade,
		});

		// Gửi alert lên Sentry với severity cao
		// Sentry.captureException(error, {
		// 	level: 'error',
		// 	tags: {
		// 		job: 'zns-new-invoice-noti-job',
		// 		jobId: job.id,
		// 		component: 'background-job',
		// 		status: 'failed',
		// 	},
		// 	extra: {
		// 		payload: job.data.payload,
		// 		attemptsMade: job.attemptsMade,
		// 		maxAttempts: job.opts.attempts,
		// 		errorMessage: error.message,
		// 		errorStack: error.stack,
		// 	},
		// });
	}
}

module.exports = { ZNSNewInvoiceNotiJob };
