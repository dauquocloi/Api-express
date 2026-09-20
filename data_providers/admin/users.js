const { default: mongoose } = require('mongoose');
const { InternalError, BadRequestError } = require('../../AppError');
const Services = require('../../service');
const generateHashPassword = require('../../utils/generateHashPassword');

exports.getUserDetail = async (phone) => {
	const result = await Services.users.findUserByPhone(phone).lean().exec();
	if (!result) throw new BadRequestError('User not found');
	return result;
};

exports.createUser = async (data) => {
	const { fullName, phone, dob, cccd, cccdIssueDate, cccdIssueAt, permanentAddress, role, gender } = data;

	const findUser = await Services.users.findUserByPhone(data.phone).lean().exec();
	if (findUser) throw new BadRequestError('User already registered');

	const passwordHashed = await generateHashPassword(data.phone, 10);

	const userCreated = await Services.users.createManagement({
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
	});

	if (!userCreated) throw new InternalError('Create user fail');

	return {
		_id: userCreated._id,
		fullName: userCreated.fullName,
		phone: userCreated.phone,
		role: userCreated.role,
	};
};
