// src/middleware/uploadMiddleware.js
import multer from "multer"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Definir o diretório de uploads
const uploadsDir = path.join(__dirname, "..", "public", "uploads")

// Verificar se o diretório existe, se não, criar
if (!fs.existsSync(uploadsDir)) {
    console.log(`Criando diretório de uploads: ${uploadsDir}`)
    fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configuração do multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
        const ext = path.extname(file.originalname)
        cb(null, file.fieldname + "-" + uniqueSuffix + ext)
    },
})

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true)
    } else {
        cb(new Error("Apenas imagens são permitidas!"), false)
    }
}

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
})

export default upload
