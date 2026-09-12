const { ConflictError } = require('../AppError');

exports.checkExistPendingTransactions = (receipts, invoices) => {
	if (Array.isArray(invoices) && invoices.length > 0) {
		const existTransactionsPending =
			invoices.find((invoice) => Array.isArray(invoice.transactionsUnconfirmed) && invoice.transactionsUnconfirmed.length > 0) || null;
		if (existTransactionsPending)
			throw new ConflictError(
				`Tồn tại ${
					existTransactionsPending?.transactionsUnconfirmed?.length || '??'
				} giao dịch chưa được xác nhận thu, vui lòng xác nhận các giao dịch này trước khi thực hiện trả phòng !`,
			);
	}

	if (Array.isArray(receipts) && receipts.length > 0) {
		const existTransactionsPending =
			receipts.find((receipt) => Array.isArray(receipt.transactionsUnconfirmed) && receipt.transactionsUnconfirmed.length > 0) || null;
		if (existTransactionsPending)
			throw new ConflictError(
				`Tồn tại ${
					existTransactionsPending?.transactionsUnconfirmed?.length || '??'
				} giao dịch chưa được xác nhận thu, vui lòng xác nhận các giao dịch này trước khi thực hiện trả phòng !`,
			);
	}
};
