export {}
const express = require('express');
const router = express.Router();
const Csv = require('../models/Csv')
const moment = require('moment')

// @route GET api/data/today
router.get('/today', async (req, res) => {
    const today = moment().subtract(1, 'days').format('MM-DD-YYYY')

    try {
        const {data} = await Csv.findOne({date: today}) || {}
        
        return res.status(200).json({data})
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({message: "Server Error"});
    }
})

// @route GET api/data/range
router.get('/range', async (req, res) => {
    try {
        const dates = await Csv.find(
            {}, 
            {
                date: 1,
                _id: 0
            }
        ).then(res => res.map(({date}) => moment(date, "MM-DD-YYYY")))

        const max = moment.max(dates)
        const min = moment.min(dates)
        
        return res.status(200).json({max, min})
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({message: "Server Error"});
    }
})

// @route GET api/data/:req_date
router.get('/:req_date', async ({ params: { req_date } }, res) => {
    try {
        const {data} = await Csv.findOne({date: req_date}) || {}
        
        return res.status(200).send(data)
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({message: "Server Error"});
    }
})

module.exports = router