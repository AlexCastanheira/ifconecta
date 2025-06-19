// src/middleware/authMiddleware.js

import prisma from "../config/prismaClient.js";

// Middleware para verificar se o usuário está autenticado
export const requireSession = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect("/auth/login");
    }
};

// Middleware para verificar se o usuário está ativo (não bloqueado)
export const requireActiveUser = (req, res, next) => {
    if (req.session && req.session.user) {
        if (req.session.user.status) {
            next();
        } else {
            res.redirect("/account-blocked");
        }
    } else {
        res.redirect("/auth/login");
    }
};

// Middleware para verificar se o usuário é um administrador
export const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.type.toLowerCase() !== "admin") {
        return res.redirect("/access-denied");
    }
    next();
};

// Middleware para disponibilizar variáveis comuns para as views
export const setCommonVariables = async (req, res, next) => {
    try {
        // CORRIGIDO: Inicializa res.locals.user como null por padrão
        res.locals.user = null;

        if (req.session.user) {
            const user = await prisma.user.findUnique({
                where: { id: req.session.user.id },
            });

            if (user) {
                req.user = user;
                res.locals.user = user; // Define o usuário se logado e encontrado no DB
            }
        }

        res.locals.req = req; // Passa o objeto req para as views
    } catch (error) {
        console.error("Erro ao carregar informações do usuário em setCommonVariables:", error);
        // Em caso de erro grave (ex: DB offline), garante que user ainda é null
        res.locals.user = null;
    }

    next();
};