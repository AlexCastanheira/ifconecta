import express from "express"
import { requireSession } from "../middleware/authMiddleware.js"

const router = express.Router()

// Página inicial
router.get("/", (req, res) => {
    res.render("index")
})


// Página de aprovação pendente
router.get("/pending-approval", requireSession, (req, res) => {
    res.render("pending-approval")
})

export default router
