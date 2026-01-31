const fib = (n) => {
	if (n <= 1) return 60; // lần đầu 60s
	let a = 60,
		b = 120;
	for (let i = 2; i <= n; i++) {
		[a, b] = [b, a + b];
	}
	return b;
};

module.exports = fib;
