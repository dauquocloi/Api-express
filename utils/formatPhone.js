function formatPhone(phone) {
	// Bỏ tất cả ký tự không phải số (phòng trường hợp có dấu cách hoặc dấu "-")
	const digits = phone.replace(/\D/g, '');

	if (digits.startsWith('0')) {
		return '84' + digits.slice(1);
	}

	// Nếu đã bắt đầu bằng 84 thì giữ nguyên
	if (digits.startsWith('84')) {
		return digits;
	}

	// Nếu không bắt đầu bằng 0 hoặc 84, tùy bạn muốn xử lý ra sao
	return '84' + digits;
}

module.exports = formatPhone;
