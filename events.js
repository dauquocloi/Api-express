class TransactionManager {
	constructor(io) {
		this.io = io;
	}

	broadcast({ type, id, payload }) {
		if (!type || !id) {
			throw new Error('type and id are required');
		}

		const room = `${type}:${id}`;
		const event = `${type}:statusUpdate`;

		this.io.to(room).emit(event, {
			id,
			status: payload.status,
			message: payload.message ?? '',
			metaData: payload.metaData,
			receivedAt: new Date(),
		});
	}
}

module.exports = { TransactionManager };
