import express from 'express'
import { verifyToken, requireRole } from '../utils/auth-middleware.js'
import { supabase } from '../utils/supabase.js'

const router = express.Router()

router.get('/', verifyToken, async (req, res) => {
    try {
        const { data: foundUser, error: foundError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', req.user.id)
            .single()


        if (!foundUser) {
            return res.status(404).json({ message: "User not found" })
        } else if (foundError) {
            return res.status(400).json({ error: foundError.message })
        }


        const { data: userTranscripts, error: userError } = await supabase
            .from('transcripts')
            .select('id, transcript, summary, tts_url, created_at , title')
            .eq('user_id', foundUser.id)
            .order('created_at', { ascending: false })


        if (!userTranscripts) {
            return res.status(404).json({ message: "User transcript not found" })
        } else if (userError) {
            return res.status(400).json({ error: userError.message })
        }


        res.status(200).json(userTranscripts)


    } catch (error) {
        console.error('ERROR: ', error)
        res.status(500).json({
            error: 'User list not get'
        })
    }
})

export default router