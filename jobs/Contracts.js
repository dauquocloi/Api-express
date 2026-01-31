const BaseJob = require('./BaseJob');
const Services = require('../service');
const mongoose = require('mongoose');
const generateContract = require('../utils/generateContract');
const moment = require('moment');
const Sentry = require('@sentry/node');

class GeneratePdfContractJob extends BaseJob {
	constructor() {
		super('generate-pdf-contract');
	}

	async handle(payload) {
		try {
			const { contractSignDate, contractEndDate, contractTerm, depositAmount, rent, feesData, interiors, buildingId, contractId } = payload;

			console.log('log of generateContractData: ', payload);

			// Validate ObjectId
			if (!mongoose.isValidObjectId(buildingId)) throw new Error('Invalid buildingId');
			if (!mongoose.isValidObjectId(contractId)) throw new Error('Invalid contractId');

			const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
			const contractObjectId = new mongoose.Types.ObjectId(contractId);

			const customerInfo = await Services.customers.findOwnerByContractId(contractObjectId).lean().exec();
			console.log('log of customerInfo: ', customerInfo);
			if (!customerInfo) throw new Error('Lỗi không tìm thấy khách hàng !');
			// Helpers
			const formatDate = (date) => ({
				DAY: moment(date).utcOffset('+07:00').format('DD'),
				MONTH: moment(date).utcOffset('+07:00').format('MM'),
				YEAR: moment(date).utcOffset('+07:00').format('YYYY'),
			});

			const FEE_UNIT_TYPE = {
				index: '/Số',
				person: '/Người',
				vehicle: '/Xe',
				room: '/Phòng',
			};

			const feesContractData = feesData.map((fee) => ({
				NAME: fee.feeName,
				AMOUNT: String(fee.feeAmount ?? ''),
				TYPE: FEE_UNIT_TYPE[fee.unit] || '',
			}));

			const interiorContractData = interiors.map((item) => ({
				NAME: item.interiorName,
				QUANT: String(item.quantity ?? ''),
			}));

			const contractDocData = {
				CREATED_DATE: formatDate(new Date()),
				PARTY_A: {
					FULLNAME: customerInfo.fullName,
					DOB: moment(customerInfo.dob).format('DD/MM/YYYY'),
					ADDRESS: customerInfo.address,
					CCCD: customerInfo.cccd,
					CCCD_DATE: moment(customerInfo.cccdIssueDate).format('DD/MM/YYYY'),
					CCCD_AT: customerInfo.cccdIssueAt,
					PHONE: customerInfo.phone,
				},
				FEES: feesContractData,
				INTERIORS: interiorContractData,
				DEPOSIT: String(depositAmount ?? ''),
				SIGN_DATE: formatDate(contractSignDate),
				END_DATE: formatDate(contractEndDate),
				CONTRACT_TERM: contractTerm,
				ROOM_PRICE: String(rent ?? 0),
			};

			console.time('generateContract take');
			const contractPdfUrl = await generateContract(contractDocData, buildingObjectId);
			console.timeEnd('generateContract take');

			console.log('log of contractPdfUrl:', contractPdfUrl);

			const updateContract = await Services.contracts.importContractPdfUrlAndContractFile(
				contractObjectId,
				contractPdfUrl.Key,
				contractDocData,
			);

			//ZNS to customer by phone here
			return updateContract;
		} catch (error) {
			console.error('❌ Worker error:', error);
			throw error; // Bull will mark the job as failed
		}
	}

	async onFailed(job, error) {
		console.error(`[Generate pdf contract job Failed] Job #${job.id}`, {
			error: error.message,
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			attemptsRemaining: job.opts.attempts - job.attemptsMade,
		});

		// Gửi alert lên Sentry với severity cao
		Sentry.captureException(error, {
			level: 'error',
			tags: {
				job: 'generate-pdf-contract',
				jobId: job.id,
				component: 'background-job',
				status: 'failed',
			},
			extra: {
				payload: job.data.payload,
				attemptsMade: job.attemptsMade,
				maxAttempts: job.opts.attempts,
				errorMessage: error.message,
				errorStack: error.stack,
			},
		});
	}
}

module.exports = {
	GeneratePdfContractJob,
};
