// src/routes/notificationRoutes.js
import express from "express"
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    renderAllNotifications,
} from "../controllers/notificationController.js"
import { requireSession } from "../middleware/authMiddleware.js"

const router = express.Router()

router.use(requireSession)

// API routes
router.get("/", getNotifications)
router.put("/read-all", markAllAsRead)
router.put("/:notificationId/read", markAsRead)

// View routes
router.get("/all", renderAllNotifications)

export default router
