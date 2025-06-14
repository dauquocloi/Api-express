const { v4: uuidv4 } = require('uuid');

exports.acbBankAccountCreate = (req, res, next) => {
	try {
		const data = req.body;
		console.log('log of data from acbBankAccountCreate: ', data);
	} catch (error) {
		next(error);
	}
};

exports.mbGetAccountHolderName = (req, res, next) => {
	try {
		var data = req.body;
		console.log('log of data from mbGetAccountHolderName: ', data);
		return res.status(200).json({
			code: 200,
			data: {
				account_holder_name: 'DAU QUOC LOI',
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.mbBankAccountCreate = (req, res, next) => {
	try {
		const data = req.body;
		console.log('log of data from mbBankAccountCreate: ', data);
		const createdBankAccountId = uuidv4();
		const requestId = uuidv4();

		return res.status(2011).json({
			code: 2011,
			message: 'Đã thêm tài khoản ngân hàng và gửi OTP xác thực liên kết API.',
			id: createdBankAccountId,
			data: {
				request_id: requestId,
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.mbBankconfirmApiConnection = (req, res, next) => {
	try {
		const requestId = req.headers['Request-Id'];
		const data = req.body;
		console.log('log of data from mbBankconfirmApiConnection: ', data);

		if (typeof data.otp === 'string' && /^[0-9]{8}$/.test(data.otp)) {
			return res.status(200).json({
				code: 200,
				message: 'Đã liên kết API tài khoản ngân hàng MB thành công.',
			});
		} else {
			throw new Error('Otp không hợp lệ');
		}
	} catch (error) {
		next(error);
	}
};

exports.createCompany = (req, res, next) => {
	try {
		const data = req.body;
		console.log('log of data from createCompany');
		if (data.full_name?.length <= 200 && data.short_name?.length <= 20) {
			const createdCompanyId = uuidv4();
			return res.status(201).json({
				code: 201,
				message: 'Đã tạo công ty (tổ chức) thành công.',
				id: createdCompanyId,
			});
		} else {
			return res.status(400).json({
				code: 400,
				message: 'Thông tin đầu vào không hợp lệ.',
			});
		}
	} catch (error) {
		next(error);
	}
};

exports.getBank = (req, res, next) => {
	const tempBankData = [
		{
			id: '192bhda',
			brand_name: 'Ngân hàng Mb bank',
			full_name: 'MB bank',
			short_name: 'Mb bank',
			code: '090111222',
			bin: '012302111',
			logo_path: '',
			icon: '',
			active: '1',
		},
		{
			id: '8487412hfasd',
			brand_name: 'Ngân hàng OCB',
			full_name: 'OCB bank',
			short_name: 'OCB bank',
			code: '873182731',
			bin: '23123123',
			logo_path: '',
			icon: '',
			active: '1',
		},
		{
			id: '192bhda',
			brand_name: 'Ngân hàng ACB bank',
			full_name: 'ACB bank',
			short_name: 'ACB bank',
			code: '090111222',
			bin: '012302111',
			logo_path: '',
			icon: '',
			active: '1',
		},
		{
			id: '53425gfdfdg',
			brand_name: 'Ngân hàng KienLong bank',
			full_name: 'KienLong bank',
			short_name: 'KienLong bank',
			code: '41283123',
			bin: '12312312',
			logo_path: '',
			icon: '',
			active: '1',
		},
	];

	return res.status(200).json({
		code: 200,
		data: tempBankData,
	});
};
