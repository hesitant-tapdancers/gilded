var db = require('../../db/db.js');
var mongoose = require('mongoose');

var EmailSchema = new mongoose.Schema({
  sentDate: {type: Date, default: Date.now},
  paid: {type: Boolean, default: false}
});

module.exports = mongoose.model('Escrow', EmailSchema);
