import * as NotificationModel from "../models/notification.js"

export const getNotifications = async (req, res) => {
  const userId = req.session.user?.id

  if (!userId) {
    return res.status(401).json({ message: "Usuário não autenticado" })
  }

  try {
    const notifications = await NotificationModel.getUnreadNotifications(userId)
    res.json(notifications)
  } catch (error) {
    console.error("Erro ao buscar notificações:", error)
    res.status(500).json({ message: "Erro ao buscar notificações" })
  }
}

export const markAsRead = async (req, res) => {
  const { notificationId } = req.params
  const userId = req.session.user?.id

  if (!userId) {
    return res.status(401).json({ message: "Usuário não autenticado" })
  }

  try {
    await NotificationModel.markNotificationAsRead(Number.parseInt(notificationId))
    res.json({ success: true })
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error)
    res.status(500).json({ message: "Erro ao marcar notificação como lida" })
  }
}

export const markAllAsRead = async (req, res) => {
  const userId = req.session.user?.id

  if (!userId) {
    return res.status(401).json({ message: "Usuário não autenticado" })
  }

  try {
    await NotificationModel.markAllNotificationsAsRead(userId)
    res.json({ success: true })
  } catch (error) {
    console.error("Erro ao marcar todas notificações como lidas:", error)
    res.status(500).json({ message: "Erro ao marcar todas notificações como lidas" })
  }
}

export const renderAllNotifications = async (req, res) => {
  const userId = req.session.user?.id

  if (!userId) {
    return res.redirect("/auth/login")
  }

  try {
    const notifications = await NotificationModel.getAllNotifications(userId)
    res.render("allNotifications", { notifications })
  } catch (error) {
    console.error("Erro ao buscar notificações:", error)
    res.status(500).render("error", {
      error: "Erro ao carregar notificações.",
      details: process.env.NODE_ENV === "development" ? error.message : null,
    })
  }
}
