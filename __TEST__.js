// const moment = require('moment');
const dayjs = require('dayjs');

console.log(dayjs().toDate().getMinutes());
console.log(dayjs().get('minute'));
console.log(dayjs().tz('Asia/Ho_Chi_Minh'));
