const { default: mongoose } = require('mongoose');
const { InternalError, BadRequestError } = require('../../AppError');
const Services = require('../../service');
const generateHashPassword = require('../../utils/generateHashPassword');

exports.getUserDetail = async (phone) => {
	const result = await Services.users.findUserByPhone(phone);
	return result;
};

exports.createUser = async (data) => {
	let session;
	try {
		session = await mongoose.startSession();
		return await session.withTransaction(async () => {
			const findUser = await Services.users.findUserByPhone(data.phone, session);
			if (findUser) throw new BadRequestError('User already registered');

			const { fullName, phone, dob, cccd, cccdIssueDate, cccdIssueAt, permanentAddress, role, gender } = data;
			const passwordHashed = await generateHashPassword(data.phone, 10);

			const userCreated = await Services.users.createManagement(
				{
					fullName,
					phone,
					dob,
					cccd,
					cccdIssueDate,
					cccdIssueAt,
					permanentAddress,
					role,
					gender,
					username: phone,
					password: passwordHashed,
				},
				session,
			);

			if (!userCreated) throw new InternalError('Create user fail');

			return {
				_id: userCreated._id,
				fullName: userCreated.fullName,
				phone: userCreated.phone,
				role: userCreated.role,
			};
		});
	} finally {
		if (session) session.endSession();
	}
};
