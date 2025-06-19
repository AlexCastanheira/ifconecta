// src/controllers/userController.js

import prisma from "../config/prismaClient.js"
import bcrypt from "bcrypt"



// ---- Estudante ----

// Visualizar perfil do estudante
const viewPerfilEstudante = async (req, res) => {
  const userId = req.session.user?.id
  if (!userId) return res.redirect("/auth/login")

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: { include: { badge: true } },
        links: true,
      },
    })

    if (!user || user.type.toLowerCase() !== "student") {
      return res.redirect("/access-denied")
    }

    res.render("viewPerfilEstudante", { user, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).render("error", {
      error: "Erro ao carregar perfil.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    })
  }
}

// Renderizar formulário de edição do perfil do estudante
const renderEditPerfilEstudante = async (req, res) => {
  const userId = req.session.user?.id
  if (!userId) return res.redirect("/auth/login")

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: { include: { badge: true } },
        links: true,
      },
    })

    if (!user || user.type.toLowerCase() !== "student") {
      return res.redirect("/access-denied")
    }

    // Buscar todos os badges disponíveis
    const availableBadges = await prisma.badge.findMany({
      orderBy: { name: "asc" },
    })

    // Filtrar badges que o usuário já possui
    const userBadgeIds = user.badges.map((ub) => ub.badgeId)
    const filteredBadges = availableBadges.filter((badge) => !userBadgeIds.includes(badge.id))

    res.render("editPerfilEstudante", {
      user,
      availableBadges: filteredBadges,
      error: null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).render("error", {
      error: "Erro ao carregar formulário de edição.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    })
  }
}

// Atualizar perfil do estudante
const updatePerfilEstudante = async (req, res) => {
  const userId = req.session.user?.id
  const { name, bio, links } = req.body
  const file = req.file

  try {
    const updateData = {
      name,
      profile: bio,
    }

    // Só atualiza a foto se uma nova for enviada
    if (file) {
      updateData.photo = file.filename
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    // Atualizar links
    await prisma.userLink.deleteMany({ where: { userId } })

    if (links) {
      const arr = links.split("\n")
      for (const url of arr) {
        if (url.trim()) {
          await prisma.userLink.create({ data: { url: url.trim(), userId } })
        }
      }
    }

    res.redirect("/users/perfil-estudante")
  } catch (err) {
    console.error(err)
    res.status(500).render("error", {
      error: "Erro ao atualizar perfil.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    })
  }
}

// Adicionar badge ao perfil do estudante
const addBadge = async (req, res) => {
  const userId = req.session.user?.id
  const { badgeId } = req.body

  if (!userId) return res.redirect("/auth/login")

  try {
    // Verificar se o usuário é um estudante
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.type.toLowerCase() !== "student") {
      return res.redirect("/access-denied")
    }

    // Verificar se o badge existe
    const badge = await prisma.badge.findUnique({
      where: { id: Number.parseInt(badgeId) },
    })

    if (!badge) {
      return res.status(404).redirect("/users/perfil-estudante/edit?error=Habilidade não encontrada.")
    }

    // Verificar se o usuário já possui este badge
    const existingBadge = await prisma.userBadge.findFirst({
      where: {
        userId,
        badgeId: Number.parseInt(badgeId),
      },
    })

    if (existingBadge) {
      return res.status(400).redirect("/users/perfil-estudante/edit?error=Você já possui esta habilidade.")
    }

    // Adicionar o badge ao usuário
    await prisma.userBadge.create({
      data: {
        userId,
        badgeId: Number.parseInt(badgeId),
      },
    })

    res.redirect("/users/perfil-estudante/edit")
  } catch (err) {
    console.error(err)
    res.status(500).render("error", {
      error: "Erro ao adicionar habilidade.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    })
  }
}

// Remover badge do perfil do estudante
const removeBadge = async (req, res) => {
  const userId = req.session.user?.id
  const badgeId = Number.parseInt(req.params.badgeId)

  try {
    await prisma.userBadge.deleteMany({
      where: {
        userId,
        badgeId,
      },
    })

    res.status(200).json({ message: "Habilidade removida com sucesso." })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Erro ao remover habilidade." })
  }
}

// ---- Empregador ----

// Visualizar perfil do empregador
const viewPerfilEmpregador = async (req, res) => {
  const userId = req.session.user?.id
  if (!userId) return res.redirect("/auth/login")

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        jobs: {
          include: {
            requirements: true,
            applications: true,
          },
          orderBy: { createdAt: "desc" },
        },
        links: true,
      },
    })

    if (!user || user.type.toLowerCase() !== "employer") {
      return res.redirect("/access-denied")
    }

    res.render("viewPerfilEmpregador", { user, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).render("error", {
      error: "Erro ao carregar perfil.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    })
  }
}

// Renderizar formulário de edição do perfil do empregador
const renderEditPerfilEmpregador = async (req, res) => {
  const userId = req.session.user?.id
  if (!userId) return res.redirect("/auth/login")

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        links: true,
      },
    })

    if (!user || user.type.toLowerCase() !== "employer") {
      return res.redirect("/access-denied")
    }

    res.render("editPerfilEmpregador", { user, error: null })
  } catch (err) {
    console.error(err)
    res.status(500).render("error", {
      error: "Erro ao carregar formulário de edição.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    })
  }
}

// Atualizar perfil do empregador
const updatePerfilEmpregador = async (req, res) => {
  const userId = req.session.user?.id
  const { name, bio, links, social } = req.body
  const file = req.file

  try {
    const updateData = {
      name,
      profile: bio,
      social,
    }

    // Só atualiza a foto se uma nova for enviada
    if (file) {
      updateData.photo = file.filename
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    // Atualizar links
    await prisma.userLink.deleteMany({ where: { userId } })

    if (links) {
      const arr = links.split("\n")
      for (const url of arr) {
        if (url.trim()) {
          await prisma.userLink.create({ data: { url: url.trim(), userId } })
        }
      }
    }

    res.redirect("/users/perfil-empregador")
  } catch (err) {
    console.error(err)
    res.status(500).render("error", {
      error: "Erro ao atualizar perfil.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    })
  }
}

// ---- Configurações de E-mail ----

// Renderizar página de configurações de e-mail
const getEmailSettings = async (req, res) => {
  const userId = req.session.user?.id
  if (!userId) return res.redirect("/auth/login")

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.redirect("/access-denied")
    }

    // Obter mensagens de erro ou sucesso da query string
    const error = req.query.error || null
    const success = req.query.success || null

    res.render("email-preferences", {
      user,
      error,
      success,
    })
  } catch (err) {
    console.error(err)
    res.status(500).render("error", {
      error: "Erro ao carregar configurações de e-mail.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    })
  }
}

// Atualizar configurações de e-mail
const updateEmailSettings = async (req, res) => {
  const userId = req.session.user?.id
  if (!userId) return res.redirect("/auth/login")

  try {
    const { emailPasswordReset, emailJobNotifications, emailMessageNotifications, emailApplicationNotifications } = req.body

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailJobNotifications: emailJobNotifications === "on",
        emailMessageNotifications: emailMessageNotifications === "on",
        emailApplicationNotifications: emailApplicationNotifications === "on",
      },
    })

    res.redirect("/users/email-preferences?success=Configurações de e-mail atualizadas com sucesso")
  } catch (err) {
    console.error(err)
    res.status(500).redirect("/users/email-preferences?error=Erro ao atualizar configurações de e-mail")
  }
}


// Excluir a própria conta
export const deleteAccount = async (req, res) => {
  const userId = req.session.user?.id
  const { password, confirm } = req.body

  if (!userId) return res.redirect("/auth/login")

  if (!confirm) {
    return res.status(400).render("delete-account", {
      error: "É necessário confirmar que deseja excluir a conta.",
      success: null,
      user: req.session.user,
    })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(400).render("delete-account", {
        error: "Senha incorreta.",
        success: null,
        user: req.session.user,
      })
    }

    await prisma.user.delete({ where: { id: userId } })

    req.session.destroy((err) => {
      if (err) {
        console.error("Erro ao encerrar sessão após exclusão:", err)
        return res.status(500).render("error", {
          error: "Conta excluída, mas ocorreu um erro ao encerrar a sessão.",
          details: process.env.NODE_ENV === "development" ? err.message : null,
        })
      }

      res.redirect("/")
    })
  } catch (err) {
    console.error("Erro ao excluir a conta:", err)
    res.status(500).render("delete-account", {
      error: "Erro ao excluir a conta. Tente novamente.",
      success: null,
      user: req.session.user,
    })
  }
}


const changePassword = async (req, res) => {
  const userId = req.session.user?.id
  const { currentPassword, newPassword, confirmPassword } = req.body

  if (!userId) return res.redirect("/auth/login")

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.render("change-password", {
      user: req.session.user,
      error: "Todos os campos são obrigatórios.",
    })
  }

  if (newPassword !== confirmPassword) {
    return res.render("change-password", {
      user: req.session.user,
      error: "A nova senha e a confirmação não coincidem.",
    })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    const passwordMatch = await bcrypt.compare(currentPassword, user.password)
    if (!passwordMatch) {
      return res.render("change-password", {
        user: req.session.user,
        error: "Senha atual incorreta.",
      })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    req.session.destroy((err) => {
      if (err) {
        console.error("Erro ao encerrar a sessão após alteração de senha:", err)
        return res.status(500).render("error", {
          error: "Senha alterada, mas houve um erro ao encerrar a sessão.",
          details: process.env.NODE_ENV === "development" ? err.message : null,
        })
      }

      res.redirect("/auth/login")
    })
  } catch (err) {
    console.error("Erro ao alterar senha:", err)
    res.status(500).render("change-password", {
      user: req.session.user,
      error: "Erro ao alterar a senha. Tente novamente.",
    })
  }
}

export {
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
  changePassword,
}
