var mongoose = require('mongoose');
// (Schema = mongoose.Schema), (ObjectId = Schema.ObjectId);
require('mongoose-double')(mongoose);

const Schema = mongoose.Schema;
// Create a Mongoose Schema

const PaymentsSchema = new Schema({
	accountnumber: String,
	accountname: String,
	bankacountname: String,
	tranfercontent: String,
	note: String,
});

exports.PaymentsEntity = mongoose.model('PaymentsEntity', PaymentsSchema, 'payments');
