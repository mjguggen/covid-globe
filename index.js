import 'dotenv/config'
import express from 'express'
import {connectDB} from './mongo/db.js'
import cors from 'cors'
import path from 'path'
import {router} from './routes/data.js'

const app = express();

connectDB()

app.use(cors());
app.use(express.json());
app.use('/api/data', router)
app.get('/api', (req, res) => res.send('GET request to the homepage'))

const PORT = process.env.PORT || 8080

if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'));
  
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
  }

app.listen(PORT, async () => {
    console.log(`Server has started on ${PORT}`)
})