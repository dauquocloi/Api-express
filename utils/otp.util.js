const crypto = require('crypto');
const bcrypt = require('bcrypt');

function generate6Digits() {
	const otp = crypto.randomInt(100000, 1000000);
	return otp.toString();
}

async function hashOtp(otp) {
	return bcrypt.hash(otp, 10);
}

async function verifyOtp(inputOtp, otpHash) {
	return bcrypt.compare(inputOtp, otpHash);
}

module.exports = { generate6Digits, hashOtp, verifyOtp };
