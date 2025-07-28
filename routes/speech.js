import express from 'express'
const router = express.Router()
import upload from '../utils/multerconfig.js'
import transcribeSpeech from '../utils/google-speech.js'
import uploadToCloudStorage from '../utils/cloud-storage.js'
import fs from 'fs'
import path from 'path'
import { verifyToken, requireRole } from '../utils/auth-middleware.js'
import { saveTranscript } from '../utils/supabase.js'
import { supabase } from '../utils/supabase.js'
import { generateShortTitle } from './summary.js'

const inputFile = path.join(process.cwd(), 'input.txt')

router.post('/upload', verifyToken, upload.single('audio'), async (req, res) => {

    try {
        const localPath = req.file.path
        const fileName = req.file.filename

        const gcsUri = await uploadToCloudStorage(localPath, fileName)
        const transcript = await transcribeSpeech(gcsUri)
        fs.unlinkSync(localPath)

        console.log(transcript)
        const title = await generateShortTitle(transcript)
        res.status(200).json({
            gcsUri,
            transcript, title
        })

        // req.user.id auth.users tablosundan geliği için kendi tablomuzdan çekecek şekilde düzenlemeliyiz
        const { data: foundUser, error } = await supabase
            .from('users')
            .select('id', 'auth_user_id')
            .eq('auth_user_id', req.user.id) // Eşleşen satıralra bakıyor
            .single()

        if (!foundUser) {
            return console.log('User not found')
        } else if (error) {
            return console.log('User not found')
        }

        console.log("USER", foundUser)

        saveTranscript(foundUser.id, transcript, gcsUri, title)
        console.log(title, 'title olustu')

        fs.writeFileSync(inputFile, transcript, 'utf-8')
        console.log("input.txt oluşturuldu!")


    } catch (error) {
        console.error('TRANSCRIBE ERROR:', error)
        res.status(500).json({
            error: 'Transcription failed'
        })

    }

})

export default router