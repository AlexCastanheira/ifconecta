// src/routes/userRoutes.js

import express from "express"
import upload from "../middleware/uploadMiddleware.js"
import prisma from "../config/prismaClient.js"
import {
  viewPerfilEstudante,
  renderEditPerfilEstudante,
  updatePerfilEstudante,
  addBadge,
  removeBadge,
  viewPerfilEmpregador,
  renderEditPerfilEmpregador,
  updatePerfilEmpregador,
  getEmailSettings,
  updateEmailSettings,
  deleteAccount,
  changePassword,
} from "../controllers/userController.js"
// Importar o middleware de usuário ativo
import { requireSession, requireActiveUser } from "../middleware/authMiddleware.js"

const router = express.Router()

// Adicionar o middleware requireActiveUser às rotas que precisam de usuário ativo
router.use(requireSession)

// Rotas para estudantes
router.get("/perfil-estudante", requireActiveUser, viewPerfilEstudante)
router.get("/perfil-estudante/edit", requireActiveUser, renderEditPerfilEstudante)
router.post("/perfil-estudante", requireActiveUser, upload.single("photo"), updatePerfilEstudante)
router.post("/perfil-estudante/badges", requireActiveUser, addBadge)
router.delete("/perfil-estudante/badges/:badgeId", requireActiveUser, removeBadge)

// Rotas para empregadores
router.get("/perfil-empregador", requireActiveUser, viewPerfilEmpregador)
router.get("/perfil-empregador/edit", requireActiveUser, renderEditPerfilEmpregador)
router.post("/perfil-empregador", requireActiveUser, upload.single("photo"), updatePerfilEmpregador)

// Rotas para configurações de e-mail
router.get("/email-preferences", requireActiveUser, getEmailSettings)
router.post("/email-preferences", requireActiveUser, updateEmailSettings)

// Alterar senha
router.get("/change-password", requireActiveUser, (req, res) => {
  res.render("change-password", { user: req.session.user })
})
router.post("/change-password", requireActiveUser, changePassword)

// Excluir conta
router.get("/delete-account", requireActiveUser, (req, res) => {
  res.render("delete-account", {
    error: null,
    success: null,
    user: req.session.user,
  })
})

router.post("/delete-account", requireActiveUser, deleteAccount)



// Adicionar a nova rota para visualizar o perfil de um usuário específico
router.get("/view/:id", async (req, res) => {
  const userId = Number.parseInt(req.params.id)
  const currentUser = req.session.user // Usuário atual

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: { include: { badge: true } },
        links: true,
      },
    })

    if (!user) {
      return res.status(404).render("error", { error: "Usuário não encontrado." })
    }

    // Verificar se o usuário é um estudante ou se o visualizador é um admin
    if (user.type.toLowerCase() === "student" || currentUser.type.toLowerCase() === "admin") {
      // Se for estudante ou o visualizador for admin, renderizar o perfil
      return res.render("viewUserProfile", {
        profileUser: user,
        user: currentUser, // Manter o usuário atual na sessão
        error: null,
      })
    } else {
      return res.status(403).render("error", { error: "Você não tem permissão para visualizar este perfil." })
    }
  } catch (err) {
    console.error(err)
    res.status(500).render("error", {
      error: "Erro ao carregar perfil do usuário.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    })
  }
})

export default router
