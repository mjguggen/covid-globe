const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CsvSchema = new Schema({
    date: {
        type: String,
        required: true
    },
    data: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('csv', CsvSchema)