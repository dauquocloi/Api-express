exports.generateQrCode = async (bankId, shortName, amount, paymentContent) => {
	try {
		const generateQr = await fetch(
			`https://qr.sepay.vn/img?acc=${bankId}&bank=${shortName}&amount=${amount}&des=${paymentContent}&template=qronly`,
		);
		if (!generateQr.ok) return null;

		const contentType = generateQr.headers.get('content-type');
		if (!contentType || !contentType.startsWith('image/')) {
			return null;
		}
		return generateQr;
	} catch (error) {
		return null;
	}
};
