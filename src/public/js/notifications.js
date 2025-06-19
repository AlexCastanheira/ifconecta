// src/public/js/notifications.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("Notifications.js carregado com sucesso!")

  const notificationsToggle = document.getElementById("notifications-toggle")
  const notificationsPanel = document.getElementById("notifications-panel")
  const markAllReadBtn = document.getElementById("mark-all-read")
  const notificationItems = document.querySelectorAll(".notification-item")

  let isPanelOpen = false

  // Toggle do dropdown
  notificationsToggle?.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()

    isPanelOpen = !isPanelOpen
    notificationsPanel.classList.toggle("active", isPanelOpen)
  })

  // Fechar dropdown ao clicar fora
  document.addEventListener("click", (e) => {
    const target = e.target

    if (
      isPanelOpen &&
      !notificationsPanel.contains(target) &&
      !notificationsToggle.contains(target)
    ) {
      notificationsPanel.classList.remove("active")
      isPanelOpen = false
    }
  })

  // Marcar todas como lidas
  markAllReadBtn?.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()

    const notifications = document.querySelectorAll(".notification-item")

    // Se não houver notificações, não faz nada
    if (notifications.length === 0) {
      return
    }

    try {
      const response = await fetch("/notifications/read-all", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        // Remove as notificações visíveis
        notifications.forEach((item) => item.remove())

        // Verifica se já existe a mensagem "Nenhuma notificação"
        const notificationsList = document.querySelector(".notifications-list")
        const alreadyHasMessage = notificationsList?.querySelector(".no-notifications")

        if (!alreadyHasMessage) {
          const noNotifications = document.createElement("div")
          noNotifications.classList.add("no-notifications")
          noNotifications.textContent = "Nenhuma notificação no momento."
          notificationsList?.appendChild(noNotifications)
        }

        // Zera o contador
        const countElement = document.getElementById("notification-count")
        if (countElement) {
          countElement.textContent = "0"
          countElement.classList.add("hidden")
        }
      } else {
        console.error("Erro ao marcar todas como lidas:", await response.text())
      }
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error)
    }
  })



  // Marcar individual como lida e redirecionar
  notificationItems.forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.stopPropagation()

      const id = item.dataset.id
      const type = item.dataset.type
      const relatedId = item.dataset.relatedId

      try {
        const response = await fetch(`/notifications/${id}/read`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        })

        if (response.ok) {
          item.classList.remove("unread")

          const countElement = document.getElementById("notification-count")
          if (countElement) {
            const currentCount = parseInt(countElement.textContent)
            const newCount = Math.max(0, currentCount - 1)

            countElement.textContent = newCount
            countElement.setAttribute("data-count", newCount)
            if (newCount === 0) {
              countElement.classList.remove("has-notifications")
            }
          }

          // Fechar painel antes de redirecionar
          notificationsPanel.classList.remove("active")
          isPanelOpen = false

          // Redirecionamento
          if (type && relatedId) {
            switch (type) {
              case "job":
              case "job_match":
              case "application":
                window.location.href = `/jobs/${relatedId}`
                break
              case "message":
                window.location.href = `/chat/${relatedId}`
                break
              default:
                break
            }

          }
        }
      } catch (error) {
        console.error("Erro ao marcar notificação como lida:", error)
      }
    })
  })

  // Buscar notificações periodicamente
  const fetchNotifications = async () => {
    try {
      const response = await fetch("/notifications")
      if (response.ok) {
        const notifications = await response.json()

        const countElement = document.getElementById("notification-count")
        if (countElement) {
          const currentCount = parseInt(countElement.getAttribute("data-count") || "0")
          const newCount = notifications.length

          countElement.textContent = newCount
          countElement.setAttribute("data-count", newCount)

          if (newCount > 0) {
            countElement.classList.add("has-notifications")
            if (newCount > currentCount) {
              playNotificationSound()
            }
          } else {
            countElement.classList.remove("has-notifications")
          }
        }
      }
    } catch (error) {
      console.error("Erro ao buscar notificações:", error)
    }
  }

  function playNotificationSound() {
    try {
      const audio = new Audio("/sounds/notification.mp3")
      audio.volume = 0.5
      audio.play().catch((err) => {
        console.error("Erro ao tocar som de notificação:", err)
      })
    } catch (error) {
      console.error("Erro ao tocar som:", error)
    }
  }

  if (notificationsToggle) {
    fetchNotifications()
    setInterval(fetchNotifications, 30000)
  }
})
