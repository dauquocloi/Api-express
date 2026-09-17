const Services = require('../service');
const { CUSTOMER_STATUS, vehicleStatus, feeUnit } = require('../constants');
const { ConflictError } = require('../AppError');
const listFeeInitial = require('../utils/getListFeeInital');

exports.formatInitialFees = (fees) =>
	fees.map((fee) => {
		const matchFee = listFeeInitial.find((feeItem) => feeItem.feeKey === fee.feeKey);

		if (matchFee.unit === feeUnit['INDEX']) {
			return {
				...matchFee,
				feeAmount: fee.feeAmount,
				firstIndex: fee.firstIndex,
				secondIndex: fee.secondIndex,
			};
		} else {
			return {
				...matchFee,
				feeAmount: fee.feeAmount,
				quantity: fee.quantity,
			};
		}
	});

exports.processImportCustomersAndVehicles = async ({ customers, contractEndDate, contractId, roomId }) => {
	const now = new Date();

	const vehiclesWithoutOwner = [];

	const customersData = (customers ?? []).map((cus, index) => {
		const vehicleLicensePlate = cus.vehicleLicensePlate?.trim();

		if (vehicleLicensePlate) {
			vehiclesWithoutOwner.push({
				licensePlate: vehicleLicensePlate,
				customerIndex: index,
			});
		}

		return {
			fullName: cus.fullName,
			gender: cus.sex.toLowerCase(),
			isContractOwner: index === 0,
			birthdate: cus.dob,
			permanentAddress: cus.address,
			phone: cus.phone,
			avatar: '',
			cccd: cus.cccd,
			cccdIssueDate: cus.cccdIssueDate,
			cccdIssueAt: cus.cccdIssueAt,
			status: CUSTOMER_STATUS['ACTIVE'],
			room: roomId,
			temporaryResidence: false,
			checkinDate: now,
			checkoutDate: contractEndDate,
			contract: contractId,
		};
	});

	const createdCustomers = await Services.customers.importCustomers(customersData);

	const ownerId = createdCustomers.find((customer) => customer.isContractOwner)?._id;

	if (!ownerId) {
		throw new ConflictError('Không tìm thấy khách hàng đứng tên hợp đồng');
	}

	await Services.contracts.importCustomerRef(contractId, ownerId);

	if (vehiclesWithoutOwner.length > 0) {
		const vehicles = vehiclesWithoutOwner.map((vehicleData) => ({
			licensePlate: vehicleData.licensePlate,
			fromDate: now,
			owner: createdCustomers[vehicleData.customerIndex]._id,
			image: '',
			room: roomId,
			status: vehicleStatus['ACTIVE'],
			contract: contractId,
		}));

		await Services.vehicles.importVehicles(vehicles);
	}
};
