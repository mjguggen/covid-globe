import mongoose from 'mongoose'
const Schema = mongoose.Schema;

const CsvSchema = new Schema({
    date: {
        type: String,
        required: true
    },
    lastUpdate: {
        type: String,
        required: true
    },
    data: {
        type: String,
        required: true
    }
})

export const Csv = mongoose.model('newcsv', CsvSchema)