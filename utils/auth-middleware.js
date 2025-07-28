import { supabase } from './supabase.js'

// 1. Token doğrulayıcı middleware
export async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization
        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header missing' })
        }

        const parts = authHeader.split(' ')
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res
                .status(401)
                .json({ error: 'Authorization header format must be Bearer <token>' })
        }

        const token = parts[1]
        if (!token) {
            return res.status(401).json({ error: 'Token bulunamadı' })
        }

        // Supabase ile token’dan kullanıcıyı al
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error) {
            return res.status(400).json({ error: error.message })
        }
        if (!user) {
            return res
                .status(401)
                .json({ error: 'Geçersiz veya süresi geçmiş token' })
        }

        req.user = { id: user.id }
        next()
    } catch (err) {
        console.error('Token doğrulama hatası:', err)
        res.status(401).json({ error: 'Kimlik doğrulama başarısız' })
    }
}

// 2. Rol kontrolü yapan middleware (örn: admin, transcipt)
export function requireRole(requiredRole) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(403).json({ error: 'Kullanıcı tanımsız' })
            }

            const { data: userData, error: userErr } = await supabase
                .from('users')
                .select('role')
                .eq('auth_user_id', req.user.id)
                .single() // get with object

            if (userErr) return res.status(401).json({ error: userErr.message })

            const userRole = userData.role

            if (requiredRole !== userRole) {
                return res.status(403).json({ message: `Bu işlem için yetkiniz yok ${requiredRole} rolüne geçiş yapmalısınız` })
            }

            next()

        } catch (err) {
            console.error('Role not found:', err)
            res.status(401).json({ error: 'Rol doğrulama başarısız' })

        }

    }
}

