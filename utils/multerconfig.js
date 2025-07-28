import multer from "multer"
import path from "path"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')    // Ses dosyalarının kaydedileceği klasör
    },
    filename: function (req, file, cb) {
        cb(null,
            file.fieldname + '-' + Date.now() + path.extname(file.originalname) // path.extname dosya uzantısını bulur
        )                                                                       // file.originalName ise dosyayı yükleyen kullanıcının bilgisauyarındaki orijimal dosya adı
    }
})

// file filter function
const checkFileFilterFunction = (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) { // mimetype dosya uzantısını alır
        cb(null, true) // Dosya kabul edildi
    } else {
        cb(new Error('Not An Voice'), false)
    }
}

const upload = multer({
    storage: storage,
    fileFilter: checkFileFilterFunction,
    limits: 5 * 1024 * 1024
})

export default upload