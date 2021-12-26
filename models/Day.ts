export {}

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

function getFloat(value) {
    if (typeof value !== 'undefined') {
        return parseFloat(value.toString());
     }
     return value;
}

const DaySchema = new Schema({
    date: {
        type: String,
        required: true
    },
    provinceState: {
        type: String,
    },
    countryRegion: {
        type: String,
        required: true
    },
    city: {
        type: String
    },
    lastUpdate: {
        type: String,
        required: true
    },
    lat: {
        type: Schema.Types.Decimal128,
        required: true,
        get: getFloat
    },
    lng: {
        type: Schema.Types.Decimal128,
        required: true,
        get: getFloat
    },
    confirmed: {
        type: Number,
        required: true
    },
    deaths: {
        type: Number,
        required: true
    },
    active: {
        type: Number,
        required: true
    }
}, {
    toJSON: {
        getters: true
    }
})

module.exports = mongoose.model('day', DaySchema);