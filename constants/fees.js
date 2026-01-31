const feeUnit = {
	PERSON: 'person',
	INDEX: 'index',
	VEHICLE: 'vehicle',
	ROOM: 'room',
};

const unitPriority = {
	room: 1,
	vehicle: 2,
	person: 3,
	index: 4,
	other: 5,
};

module.exports = { feeUnit, unitPriority };
