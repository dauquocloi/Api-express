function generateContractCode(length = 5) {
	return new Promise((resolve, reject) => {
		try {
			const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
			const charsArray = chars.split('');

			if (length > charsArray.length) {
				return reject(new Error('Length exceeds unique character set size.'));
			}

			for (let i = charsArray.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[charsArray[i], charsArray[j]] = [charsArray[j], charsArray[i]];
			}

			const result = charsArray.slice(0, length).join('');

			resolve(result);
		} catch (error) {
			reject(error);
		}
	});
}

module.exports = generateContractCode;
