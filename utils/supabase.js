import dotenv from 'dotenv'
dotenv.config()
import { createClient } from '@supabase/supabase-js'
import express from "express"

const router = express.Router()
const supabase_url = 'https://jciokewqjfunqegcfnqd.supabase.co'
const supabase_key = process.env.SUPABASE_KEY


export const supabase = createClient(supabase_url, supabase_key, {
    auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false
    }
})

router.post('/register', async (req, res) => {

    const { email, password, full_name } = req.body

    const { data: registerData, error: registerError } = await supabase.auth.signUp(
        {
            email: email,
            password: password,
            options: {
                data: { full_name: full_name }
            }

        })

    if (registerError) return res.status(400).json({ error: registerError.message })

    // Otomatik kayıt edilen tablomuzun adı auth.users token kısmında kullanılacağı için 'users' tablomuzun içine attık
    const authUserID = registerData.user.id

    const { insertError } = await supabase
        .from('users')
        .insert([
            {
                email: email,
                auth_user_id: authUserID,
                full_name: full_name,
                role: 'free'
            }
        ])

    if (insertError) return res.status(400).json({ error: insertError.message })


    res.status(200).json({
        success: true,
        message: "Kayıt Başarılı",
        data: authUserID
    })


})

router.post('/login', async (req, res) => {

    console.log('Gelen body:', req.body)
    const { email, password } = req.body

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    })


    if (loginError) return res.status(400).json({ error: loginError.message })

    res.status(200).json({
        success: true,
        message: "Giriş Başarılı",
        token: loginData.session.access_token
    })

})

// 2. Transcript verisini supabase'e kaydet
export async function saveTranscript(user_id, transcript, gcsUri, title) {
    const { data, error } = await supabase
        .from('transcripts')
        .insert({
            user_id: user_id,
            transcript: transcript,
            audio_url: gcsUri,
            title: title,
            created_at: new Date().toISOString()
        })

    if (error) {
        console.error('Transkript kaydedilemedi:', error)
        throw new Error('Transkript kaydedilemedi')
    }

    return data
}


// 3. Özet verisini ekle
export async function saveSummary(transcriptId, summaryText) {
    console.log('saveSummary çağrıldı:', { transcriptId, summaryLength: summaryText.length })

    const { data, error } = await supabase
        .from('transcripts')
        .update({ summary: summaryText })
        .eq('id', transcriptId)
        .select()

    if (error) {
        console.error('Özet kaydedilemedi:', error)
        throw new Error('Özet kaydedilemedi: ' + error.message)
    }

    console.log('Summary başarıyla kaydedildi:', data)
    return data
}

// 3. TTS-result voice add database
export async function saveResultVoice(user_id, gcsTTS) {
    const { data, error } = await supabase
        .from('transcripts')
        .update({ tts_url: gcsTTS })
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .select()

    if (error) {
        console.error('Voice file cant add database:', error)
        throw new Error('Voice file not save')
    }

    return data
}




// 4. (İsteğe bağlı) Sohbet geçmişini kaydet
export async function saveChat(user_id, message) {
    const { data, error } = await supabase
        .from('chat history')
        .insert({
            user_id,
            message,
            timestamp: new Date().toISOString()
        })

    if (error) {
        console.error('Chat kaydı başarısız:', error)
        throw new Error('Sohbet kaydedilemedi')
    }

    return data
}

// 5. (İsteğe bağlı) Kullanıcının geçmiş sohbetlerini getir
export async function getUserChatHistory(user_id) {
    const { data, error } = await supabase
        .from('chat history')
        .select('*')
        .eq('user_id', user_id)
        .order('timestamp', { ascending: false })

    if (error) {
        console.error('Chat geçmişi alınamadı:', error)
        throw new Error('Sohbet geçmişi alınamadı')
    }

    return data
}

export default router