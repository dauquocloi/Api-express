function generatePaymentContent(length = 5) {
	const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const charsArray = chars.split('');

	if (length > charsArray.length) {
		throw new Error('Length exceeds unique character set size.');
	}

	// Trộn mảng ký tự
	for (let i = charsArray.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[charsArray[i], charsArray[j]] = [charsArray[j], charsArray[i]];
	}

	// Lấy ra `length` ký tự đầu tiên
	return charsArray.slice(0, length).join('');
}

module.exports = generatePaymentContent;
