const Services = require('../../service');

const { receiptStatus, invoiceStatus, contractStatus, billType } = require('../../constants');
const { NoDataError, NotFoundError, BadRequestError, ConflictError } = require('../../AppError');
const getFieldUrl = require('../../utils/getFileUrl');
const { targetType, purpose } = require('../../constants/otps');
const { generate6Digits, hashOtp, verifyOtp } = require('../../utils/otp.util');

exports.getInvoiceInfoByInvoiceCode = async (billCode) => {
	const invoiceInfo = await Services.invoices.getInvoiceInfoByInvoiceCode(billCode);
	if (invoiceInfo) {
		if (invoiceInfo.status === invoiceStatus['TERMINATED']) {
			throw new NoDataError(`Hóa đơn ${billCode} đã bị hủy`);
		}
		const roomInfo = await Services.rooms.findById(invoiceInfo.room).lean().exec();
		if (!roomInfo) throw new NotFoundError('Dữ liệu không tồn tại !');
		const { writeLock } = roomInfo;
		if (writeLock.locked === true && writeLock.expAt < new Date())
			throw new ConflictError('Phòng hiện đang được cập nhật, vui lòng thử lại sau !');
		return { ...invoiceInfo, type: billType['INVOICE'] };
	}

	const receiptInfo = await Services.receipts.getReceiptInfoByReceiptCode(billCode);

	if (receiptInfo) {
		if (receiptInfo.status !== receiptStatus['CANCELLED'] || receiptInfo.status !== receiptStatus['TERMINATED']) {
			const roomInfo = await Services.rooms.findById(receiptInfo.room).lean().exec();
			if (!roomInfo) throw new NotFoundError('Dữ liệu không tồn tại !');

			const { writeLock } = roomInfo;
			if (writeLock.locked === true && writeLock.expAt < new Date())
				throw new ConflictError('Phòng hiện đang được cập nhật, vui lòng thử lại sau !');

			return { ...receiptInfo, type: billType['RECEIPT'] };
		} else throw new NoDataError(`Hóa đơn ${billCode} đã bị hủy`);
	}

	throw new NotFoundError(`Hóa đơn ${billCode} không tồn tại`);
};

exports.getContractInfo = async (contractCode) => {
	const normalizeContractCode = contractCode.trim();
	const contract = await Services.contracts.findByContractCode(normalizeContractCode).lean().exec();
	if (!contract) throw new NotFoundError('Hợp đồng không tồn tại !');

	const customer = await Services.customers.findOwnerByContractId(contract._id).populate({ path: 'room', populate: 'building' }).lean().exec();
	if (!customer) throw new NotFoundError('Không tìm thấy khách hàng');

	const lastestContractVersion = contract.versions.find((v) => v.contractCode === normalizeContractCode);

	const contractUrl = await getFieldUrl(lastestContractVersion.contractPdfUrl);
	const contractInfo = {
		contractPdfUrl: contractUrl,
		_id: contract._id,
		status: lastestContractVersion.status,
		isCustomerConfirmed: lastestContractVersion.customerConfirmed,
		contractTerm: lastestContractVersion.contractTerm,
		contractSignDate: lastestContractVersion.contractSignDate,
		contractEndDate: lastestContractVersion.contractEndDate,
		rent: lastestContractVersion.rent,
		depositAmount: lastestContractVersion.depositAmount,
		contractCode: lastestContractVersion.contractCode,
	};
	return {
		fullName: customer.fullName,
		phone: customer.phone,
		temporaryResidence: customer.temporaryResidence,
		roomIndex: customer.room.roomIndex,
		buildingAddress: customer.room.building.buildingAddress,
		contractInfo,
	};
};

exports.confirmationContract = async (contractId, otp) => {
	const contract = await Services.contracts.findById(contractId).lean().exec();
	if (!contract) throw new NotFoundError('Dữ liệu không tồn tại');
	if (contract.status === contractStatus['TERMINATED'] || contract.status === contractStatus['SUSPENDED'])
		throw new BadRequestError('Hợp đồng này đã bị hủy !');

	const hasUnconfirmedVersion = contract.versions?.some((v) => v.customerConfirmed === false);
	if (!hasUnconfirmedVersion) throw new BadRequestError('Hợp đồng đã được xác nhận');

	const currentOtp = await Services.otps.findByTargetId(contractId).lean().exec();
	if (!currentOtp) throw new BadRequestError('Mã OTP không hợp lệ hoặc đã hết hạn !');

	const validOtp = await verifyOtp(otp, currentOtp.otpHash);
	if (!validOtp) throw new BadRequestError('Mã OTP Không hợp lệ !');

	await Services.contracts.clientConfirmContract(contractId);
};

exports.requestConfirmContractOtp = async (contractId) => {
	let now = new Date();
	const otp = generate6Digits();
	console.log('log of OTP: ', otp);
	const otpHash = await hashOtp(otp);

	const contract = await Services.contracts.findById(contractId).populate('customer').lean().exec();
	if (!contract) throw new NotFoundError('Hợp đồng không tồn tại');

	const existedOtp = await Services.otps.findByTargetId(contract._id);
	if (existedOtp) {
		if (now < new Date(existedOtp.expiredAt).getTime()) {
			throw new BadRequestError('Mã OTP chưa hết hạn !');
		}

		//resend
		const resendCount = existedOtp.resendCount + 1;
		const delay = fib(resendCount);

		existedOtp.resendCount = resendCount;
		existedOtp.nextResendAt = new Date(now.getTime() + delay * 1000);
		await existedOtp.save();

		return;
	} else {
		await Services.otps.generateOtp({
			targetId: contract._id.toString(),
			targetType: targetType['CONTRACT'],
			purpose: purpose['CONTRACT_CONFIRMATION'],
			phone: contract.customer.phone,
			otpHash: otpHash,
		});
		return;
	}
};
