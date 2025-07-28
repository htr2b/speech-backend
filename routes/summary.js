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


// 4) GET /summary → en güncel input.txt’i oku , özetle, hem JSON dön hem de output.txt’e yaz
router.get('/', verifyToken, requireRole('pro'), async (req, res, next) => {
    try {
        // 4.1) input ve prompt’u her istekte okuyun
        const [inputText, prompt] = await Promise.all([
            fs.readFile(INPUT_FILE, 'utf8'),
            fs.readFile(PROMPT_FILE, 'utf8')
        ])

        if (!inputText.trim()) {
            return res
                .status(400)
                .json({ status: 'error', message: 'input.txt boş.' })
        }

        // 4.2) cümlelere böl ve 100 kelimelik parçalara ayır
        const sentences = nlp(inputText).sentences().out('array')
        const chunks = chunkText(sentences, 100)

        // 4.3) Cohere chat çağrısı
        const response = await cohere.chat({
            model: 'command-a-03-2025',
            messages: [{
                role: 'user',
                content: prompt + "\n\n" + chunks.join("\n\n")
            }]
        })

        // 4.4) API yanıtından özet metnini çek
        // CohereClientV2 chat API'sı, choices dizisi yerine message.content içinde de olabilir:
        const summaryText = (
            response.choices?.[0]?.message?.content
            || response.message?.content?.[0]?.text
            || ''
        ).trim()

        const shortTitle = await generateShortTitle(summaryText)
        console.log('Short Title:', shortTitle)

        // 4.5) Özet metnini output.txt’e yaz (tek satıra sıkıştırılmış)
        const normalized = summaryText
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        await fs.writeFile(OUTPUT_FILE, normalized, 'utf8')

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

        saveSummary(foundUser.id, summaryText)

        // 4.6) İstemciye JSON ile dönün
        res.json({ status: 'success', summary: summaryText, shortTitle })

    } catch (err) {
        console.error('Summary route error:', err)
        next(err)
    }
})

export default router