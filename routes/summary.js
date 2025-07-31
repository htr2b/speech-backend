// routes/summary.js
import dotenv from 'dotenv'
dotenv.config()
import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { CohereClientV2 } from 'cohere-ai'
import nlp from 'compromise'
import { verifyToken, requireRole } from '../utils/auth-middleware.js'
import { saveSummary } from '../utils/supabase.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

// 1) Cohere istemcisini API key ile başlatın
const cohere = new CohereClientV2({
    apiKey: process.env.COHERE_API_KEY
})

// 2) Dosya yollarınızı sabitleyin
const INPUT_FILE = path.join(process.cwd(), 'input.txt')
const PROMPT_FILE = path.join(process.cwd(), 'prompt.txt')
const OUTPUT_FILE = path.join(process.cwd(), 'output.txt')

// 3) Metni cümlelere bölüp parçalara ayıracak yardımcı
function chunkText(sentences, maxWords) {
    const chunks = []
    let current = [], count = 0

    for (const s of sentences) {
        const w = s.split(' ').length
        if (count + w > maxWords) {
            chunks.push(current.join(' '))
            current = [s]
            count = w
        } else {
            current.push(s)
            count += w
        }
    }
    if (current.length) chunks.push(current.join(' '))
    return chunks
}

// En fazla 3 kelimelik başlık üretici fonksiyon
export async function generateShortTitle(transcipt) {
    const promptTitle = `Generate a meaningful and concise title (maximum 3 words) that summarizes the following text: \n\n"${transcipt}"\n\nTitle:`
    const response = await cohere.chat({
        model: 'command-a-03-2025',
        messages: [{
            role: 'user',
            content: promptTitle
        }]
    })
    return (
        response.choices?.[0]?.message?.content
        || response.message?.content?.[0]?.text
        || ''
    ).replace(/^[\s"'*.,:;!?-]+/, '')   // baştaki boşluk ve noktalama işaretlerini sil
        .replace(/[.,:;!?'"*]/g, '')       // başlık içindeki tüm noktalama işaretlerini sil
        .replace(/[\s"'*.,:;!?-]+$/, '')   // sondaki boşluk ve noktalama işaretlerini sil
        .trim()
}

// 4) GET /summary → en güncel input.txt'i oku , özetle, hem JSON dön hem de output.txt'e yaz
router.get('/', verifyToken, requireRole('pro'), async (req, res, next) => {
    try {
        // İlk önce transcript ID'sini al
        const transcriptId = req.query.transcript_id
        console.log('Gelen transcript_id:', transcriptId)

        if (!transcriptId) {
            return res.status(400).json({ error: 'transcript_id gerekli' })
        }

        // Kullanıcıyı bul
        const { data: foundUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', req.user.id)
            .single()

        if (userError || !foundUser) {
            console.log('User not found:', userError)
            return res.status(404).json({ error: 'User not found' })
        }

        console.log("USER", foundUser)

        // Bu transcript'in bu kullanıcıya ait olduğunu kontrol et
        console.log('Kullanıcı ID:', foundUser.id, 'Transcript ID:', transcriptId)
        const { data: transcript, error: transcriptError } = await supabase
            .from('transcripts')
            .select('id, user_id')
            .eq('id', transcriptId)
            .eq('user_id', foundUser.id)
            .single()

        console.log('Transcript sorgu sonucu:', { transcript, transcriptError })

        if (transcriptError || !transcript) {
            console.log('Transcript not found or not owned by user:', transcriptError)
            return res.status(404).json({ error: 'Transcript bulunamadı' })
        }

        // Aktif transcript'i al
        const { data: currentTranscript, error: fetchError } = await supabase
            .from('transcripts')
            .select('transcript')
            .eq('id', transcriptId)
            .single()

        if (fetchError || !currentTranscript?.transcript) {
            return res.status(404).json({ error: 'Transcript content bulunamadı' })
        }

        console.log('Aktif transcript:', currentTranscript.transcript.substring(0, 100) + '...')

        // Aktif transcript'i input.txt'ye yaz
        await fs.writeFile(INPUT_FILE, currentTranscript.transcript, 'utf8')

        // Prompt'u oku
        const prompt = await fs.readFile(PROMPT_FILE, 'utf8')

        console.log('Input file yazıldı, uzunluk:', currentTranscript.transcript.length)

        // cümlelere böl ve 100 kelimelik parçalara ayır
        const sentences = nlp(currentTranscript.transcript).sentences().out('array')
        const chunks = chunkText(sentences, 100)

        console.log('Sentences count:', sentences.length, 'Chunks count:', chunks.length)

        // Cohere chat çağrısı
        console.log('Cohere\'ye gönderilen text preview:', chunks.join("\n\n").substring(0, 200) + '...')

        const response = await cohere.chat({
            model: 'command-a-03-2025',
            messages: [{
                role: 'user',
                content: prompt + "\n\n" + chunks.join("\n\n")
            }]
        })

        // API yanıtından özet metnini çek
        const summaryText = (
            response.choices?.[0]?.message?.content
            || response.message?.content?.[0]?.text
            || ''
        ).trim()

        console.log('Cohere response preview:', summaryText.substring(0, 200) + '...')

        const shortTitle = await generateShortTitle(currentTranscript.transcript)
        console.log('Short Title:', shortTitle)

        // Özet metnini output.txt'e yaz
        const normalized = summaryText
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        await fs.writeFile(OUTPUT_FILE, normalized, 'utf8')

        // Summary'yi kaydet
        const saveResult = await saveSummary(transcriptId, summaryText)

        // İstemciye JSON ile dönün
        res.json({
            status: 'success',
            summary: summaryText,
            shortTitle,
            transcript_id: transcriptId
        })

    } catch (err) {
        console.error('Summary route error:', err)
        res.status(500).json({ error: 'Summary generation failed' })
    }
})

export default router