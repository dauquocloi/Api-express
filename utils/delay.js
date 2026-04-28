//FOR TESTING

module.exports = async (ms, isFailed = false) => {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			if (isFailed) {
				reject(new Error('Failed'));
			} else {
				resolve();
			}
		}, ms);
	});
};
