require('dotenv').config()
const express = require('express')
const connectDB = require('./mongo/db')
const getAll = require('./util/getData')
const cors = require('cors')
const cron = require('node-cron')
const path = require('path');
const app = express();

app.use(cors({ origin: process.env.CLIENT || 'http://localhost:3000' }));
app.use(express.json());
app.use('/api/data', require('./routes/data'))
app.get('/api', (req, res) => res.send('GET request to the homepage'))

const PORT = process.env.PORT || 8080

app.use(express.static('client/build'));

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
});

app.listen(PORT, async () => {
    console.log(`Server has started on ${PORT}`)

    await connectDB()

    cron.schedule(
        '0 0 */2 * * *', 
        () => {
            getAll()
        }
    )
})