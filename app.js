import express from 'express'
import dotenv from 'dotenv'
dotenv.config()
import summaryRouter from './routes/summary.js'
import speechRoutes from './routes/speech.js'
import ttsRouter from './routes/tts.js'
import supabaseRouter from './utils/supabase.js'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import historyRouter from './routes/history.js'
import freeToProRouter from './routes/free_to_pro.js'


const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())
app.use('/tts', ttsRouter)
app.use('/speech', speechRoutes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/speech/summary', summaryRouter)
app.use('/user', supabaseRouter)
app.use(express.static(path.join(__dirname, '../public')))
app.use('/history', historyRouter)
app.use('/pro', freeToProRouter)



const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

