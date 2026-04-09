const moment = require('moment');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
dayjs.extend(timezone);

const START_HOUR = 8; // 08:00
const END_HOUR = 18; // 18:00

function isInAllowedSendZNSTime() {
	const now = dayjs().tz('Asia/Ho_Chi_Minh');
	const hour = now.hour();

	return hour >= START_HOUR && hour < END_HOUR;
}

function getDelayToNextWindow() {
	const now = dayjs().tz('Asia/Ho_Chi_Minh');

	const nextStart = now.clone().add(1, 'day').hour(START_HOUR).minute(0).second(0);

	return nextStart.diff(now);
}

module.exports = {
	isInAllowedSendZNSTime,
	getDelayToNextWindow,
};
