const mongoose = require('mongoose');
const moment = require('moment');
const Services = require('../../service');
const { generateContract } = require('../../utils/generateContract');
const { FEE_UNIT_TYPE } = require('../../constants/fees');

const handleGenerateContractJob = async (payload) => {
	try {
		const { buildingId, contractId } = payload;
		const contract = await Services.contracts.findById(contractId).populate({ path: 'room', select: 'interior' }).lean().exec();

		if (!contract) throw new Error('Hợp đồng không tồn tại !');

		const { contractSignDate, contractEndDate, contractTerm, depositAmount, rent, fees, room } = contract;

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

		const feesContractData = fees.map((fee) => ({
			NAME: fee.feeName,
			AMOUNT: String(fee.feeAmount ?? ''),
			TYPE: FEE_UNIT_TYPE[fee.unit] || '',
		}));

		const interiorContractData = room.interior.map((item) => ({
			NAME: item.interiorName,
			QUANT: String(item.quantity ?? ''),
		}));

		const contractDocData = {
			CREATED_DATE: formatDate(new Date()),
			PARTY_A: {
				FULLNAME: customerInfo.fullName,
				DOB: moment(customerInfo.birthdate).format('DD/MM/YYYY'),
				ADDRESS: customerInfo.permanentAddress,
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

		const updateContract = await Services.contracts.importContractPdfUrlAndContractFile(contractObjectId, contractPdfUrl.Key, contractDocData);

		//ZNS to customer by phone here
		return updateContract;
	} catch (error) {
		console.error(' Worker error:', error);
		throw error; // Bull will mark the job as failed
	}
};

module.exports = { handleGenerateContractJob };
