// src/routes/jobRoutes.js
import express from "express"
import {
  renderCreateJobForm,
  renderEditJobForm,
  createJob,
  updateJob,
  renderJobsList,
  renderJobDetails,
  applyForJob,
  deleteJob,
  updateApplicationStatus,
  cancelApplication,
  revertApplicationStatus,
  closeJobApplications,
  reopenJobApplications,
} from "../controllers/jobController.js"
// Importar o middleware de usuário ativo
import { requireSession, requireActiveUser } from "../middleware/authMiddleware.js"

const router = express.Router()

// Adicionar o middleware requireActiveUser às rotas que precisam de usuário ativo
router.use(requireSession)

// Rotas de visualização
router.get("/create", requireActiveUser, renderCreateJobForm)
router.get("/list", renderJobsList) // Todos podem ver a lista de vagas
router.get("/:id", renderJobDetails) // Todos podem ver detalhes da vaga
router.get("/:id/edit", requireActiveUser, renderEditJobForm)

// Rotas de ação
router.post("/", requireActiveUser, createJob)
router.post("/:id/apply", requireActiveUser, applyForJob)
router.put("/:id", requireActiveUser, updateJob)
router.post("/:id", requireActiveUser, (req, res) => {
  // Para lidar com formulários que não suportam PUT diretamente
  if (req.body._method === "PUT") {
    return updateJob(req, res)
  }
  res.status(405).send("Method Not Allowed")
})
router.delete("/:id", requireActiveUser, deleteJob)

// Rotas para gerenciar candidaturas
router.post("/applications/:id/status", requireActiveUser, updateApplicationStatus)
router.delete("/applications/:id", requireActiveUser, cancelApplication)
router.post("/applications/:id/revert", requireActiveUser, revertApplicationStatus)

// Rota para encerrar candidaturas
router.post("/:id/close", requireActiveUser, closeJobApplications)

// Rota para reabrir candidaturas
router.post("/:id/reopen", requireActiveUser, reopenJobApplications)

export default router
