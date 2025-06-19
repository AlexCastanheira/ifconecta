// src/routes/chatRoutes.js
import express from "express"
import {
  startChat,
  startAdminChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  renderChat,
  renderChatsList,
  closeChat,
  reactivateChat,
  renderChatInterface,
} from "../controllers/chatController.js"
import { requireSession } from "../middleware/authMiddleware.js"

const router = express.Router()

router.use(requireSession)

// API routes
router.post("/start", startChat)
router.post("/start-admin", startAdminChat)
router.get("/api/list", getUserChats)
router.get("/api/:chatId/messages", getChatMessages)
router.post("/api/:chatId/messages", sendMessage)
router.post("/api/:chatId/close", closeChat)
router.post("/api/:chatId/reactivate", reactivateChat)

// View routes
router.get("/interface", renderChatInterface) // Nova rota para a interface integrada
router.get("/list", renderChatsList)
router.get("/:chatId", renderChat)

export default router
