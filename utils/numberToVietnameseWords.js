const NUMBER_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

const GROUP_UNITS = ['', 'nghìn', 'triệu', 'tỷ'];

function readThreeDigits(number, isFull = false) {
	const hundreds = Math.floor(number / 100);
	const tens = Math.floor((number % 100) / 10);
	const units = number % 10;

	let result = [];

	if (hundreds > 0 || isFull) {
		result.push(NUMBER_WORDS[hundreds], 'trăm');
	}

	if (tens > 1) {
		result.push(NUMBER_WORDS[tens], 'mươi');

		if (units === 1) {
			result.push('mốt');
		} else if (units === 5) {
			result.push('lăm');
		} else if (units > 0) {
			result.push(NUMBER_WORDS[units]);
		}
	} else if (tens === 1) {
		result.push('mười');

		if (units === 5) {
			result.push('lăm');
		} else if (units > 0) {
			result.push(NUMBER_WORDS[units]);
		}
	} else if (units > 0) {
		if (hundreds > 0 || isFull) {
			result.push('lẻ');
		}

		result.push(NUMBER_WORDS[units]);
	}

	return result.join(' ');
}

function numberToVietnameseWords(value, options = {}) {
	const { currency = true, capitalize = true } = options;

	if (value === null || value === undefined || value === '') {
		return '';
	}

	const number = Number(value);

	if (!Number.isFinite(number)) {
		throw new Error('Giá trị đầu vào không hợp lệ');
	}

	if (number === 0) {
		return capitalize ? `Không${currency ? ' đồng' : ''}` : `không${currency ? ' đồng' : ''}`;
	}

	const isNegative = number < 0;
	const integer = Math.floor(Math.abs(number));

	if (!Number.isSafeInteger(integer)) {
		throw new Error('Số vượt quá giới hạn an toàn của JavaScript');
	}

	let remaining = integer;
	let groups = [];

	while (remaining > 0) {
		groups.push(remaining % 1000);
		remaining = Math.floor(remaining / 1000);
	}

	if (groups.length > 13) {
		throw new Error('Số quá lớn để chuyển thành chữ');
	}

	let parts = [];

	for (let i = groups.length - 1; i >= 0; i--) {
		const group = groups[i];

		if (group === 0) continue;

		const isFull = i < groups.length - 1 && group < 100;
		const words = readThreeDigits(group, isFull);

		parts.push(words);

		if (GROUP_UNITS[i % 3]) {
			parts.push(GROUP_UNITS[i % 3]);
		}

		if (i >= 3 && i % 3 === 0) {
			parts.push('tỷ');
		}
	}

	let result = parts.join(' ').replace(/\s+/g, ' ').trim();

	if (currency) {
		result += ' đồng';
	}

	if (isNegative) {
		result = `âm ${result}`;
	}

	if (capitalize) {
		result = result.charAt(0).toUpperCase() + result.slice(1);
	}

	return result;
}

module.exports = numberToVietnameseWords;
