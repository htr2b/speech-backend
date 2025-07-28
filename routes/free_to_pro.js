import express from 'express'
import { verifyToken } from '../utils/auth-middleware.js'
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

        const { data : userData, error } = await supabase
            .from('users')
            .update({ role: 'pro' })
            .eq('id', foundUser.id)
            .select()


        if (error) {
            console.error('Pro rolüne geçiş sağlanamadı :', error.message)
            throw new Error('Pro rolüne geçilemedi')
        }

        res.status(200).json({
            success : true,
            data : userData[0].role
            
        })

    } catch (error) {
        console.error('FREE TO PRO ERROR :', error)
        res.status(500).json({
            error: 'Role change failed'
        })

    }

})

export default router