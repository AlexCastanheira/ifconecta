// src/routes/adminRoutes.js
import express from "express"
import { requireSession, isAdmin } from "../middleware/authMiddleware.js"
import * as adminController from "../controllers/adminController.js"

const router = express.Router()

// Middleware para verificar se o usuário é admin
router.use(requireSession, isAdmin)

// Dashboard
router.get("/dashboard", adminController.getDashboard)

// Relatórios e Análises (nova rota que substitui os logs)
router.get("/reports", adminController.getReports)

// Gerenciar estudantes
router.get("/students", adminController.getStudents)

// Gerenciar empregadores
router.get("/employers", adminController.getEmployers)

// Gerenciar empregadores pendentes
router.get("/pending-employers", adminController.getPendingEmployers)

// Aprovar empregador
router.post("/employers/:id/approve", adminController.approveEmployer)

// Rejeitar empregador
router.post("/employers/:id/reject", adminController.rejectEmployer)

// Alternar status do usuário (bloquear/desbloquear)
router.post("/users/:id/toggle-status", adminController.toggleUserStatus)

// Excluir usuário
router.delete("/users/:id", adminController.deleteUser)

// Gerenciar vagas
router.get("/jobs", adminController.getJobs)

// Excluir vaga
router.delete("/jobs/:id", adminController.deleteJob)

// NOVO: Gerenciar Badges
router.get("/badges/add", adminController.renderAddBadgeForm)
router.post("/badges", adminController.addBadge)

export default router