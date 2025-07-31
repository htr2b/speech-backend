// routes/tts.js
import express from 'express'
import dotenv from 'dotenv'
dotenv.config()

import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { Storage } from '@google-cloud/storage'
import { verifyToken, requireRole } from '../utils/auth-middleware.js'
import { supabase } from '../utils/supabase.js'
import { saveResultVoice } from '../utils/supabase.js'

const router = express.Router()
const ttsClient = new TextToSpeechClient()

const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
})
const bucket = storage.bucket(process.env.GCLOUD_BUCKET_NAME)


async function uploadAndSign(buffer, fileName) {
  const remotePath = `tts_results/${fileName}`
  const file = bucket.file(remotePath)

  await file.save(buffer, {
    metadata: { contentType: 'audio/mpeg' }
  })

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })

  return url
}

router.post(
  '/',
  verifyToken,
  requireRole('pro'),
  express.json(),
  async (req, res) => {
    const { summary } = req.body
    if (!summary || typeof summary !== 'string') {
      return res
        .status(400)
        .json({ error: 'Summary text is missing or invalid.' })
    }

    try {
      const [response] = await ttsClient.synthesizeSpeech({
        input: { text: summary },
        voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' },
        audioConfig: { audioEncoding: 'MP3' }
      })

      const fileName = `summary_${Date.now()}.mp3`
      const audioUrl = await uploadAndSign(response.audioContent, fileName)

      const { data: user, error: uErr } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', req.user.id)
        .single()
      if (user && !uErr) {
        await saveResultVoice(user.id, audioUrl)
      }

      return res.json({ audioUrl })
    } catch (err) {
      console.error('TTS Error:', err)
      return res
        .status(500)
        .json({ error: err.message || 'TTS synthesis failed.' })
    }
  }
)

export default router
