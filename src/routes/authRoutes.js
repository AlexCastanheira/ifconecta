// src/routes/authRoutes.js
import express from "express"
import {
    renderLogin,
    renderRegister,
    login,
    register,
    logout,
    renderForgotPassword,
    forgotPassword,
    renderResetPassword,
    resetPassword,
    renderRegistrationSuccess,
    confirmEmail,
} from "../controllers/authController.js"

const router = express.Router()

// Rotas de visualização
router.get("/login", renderLogin)
router.get("/register", renderRegister)
router.get("/forgot-password", renderForgotPassword)
router.get("/reset-password/:userId/:token", renderResetPassword)
router.get("/registration-success", renderRegistrationSuccess)
router.get("/confirm-email/:userId/:token", confirmEmail)

// Rotas de processamento
router.post("/login", login)
router.post("/register", register)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password/:userId/:token", resetPassword)
router.get("/logout", logout)

export default router