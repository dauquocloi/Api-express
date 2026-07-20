async function deepMutate(data, predicate, transformer) {
	if (Array.isArray(data)) {
		await Promise.all(data.map((item) => deepMutate(item, predicate, transformer)));
		return;
	}

	if (data === null || typeof data !== 'object') {
		return;
	}

	await Promise.all(
		Object.entries(data).map(async ([key, value]) => {
			if (predicate(key, value, data)) {
				data[key] = await transformer(value);
				return;
			}

			await deepMutate(value, predicate, transformer);
		}),
	);
}

module.exports = deepMutate;
