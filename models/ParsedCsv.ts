export {}

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ParsedCsv = new Schema({
    date: {
        type: String,
        required: true
    },
    lastUpdate: {
        type: String,
        required: true,
    },
    data: {
        type: [],
        required: true
    }
})

module.exports = mongoose.model('parsedcsv', ParsedCsv)