// src/app.js
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { PrismaClient } from "@prisma/client";
import methodOverride from "method-override";
import { setCommonVariables } from "./middleware/authMiddleware.js";
// CORRIGIDO: Importação de getUnreadNotifications
import { getUnreadNotifications } from "./models/notification.js";

// Configuração do ambiente
dotenv.config();

// Para lidar com __dirname com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method")); // Adicionar suporte para PUT e DELETE em formulários

// Configuração da sessão
app.use(
  session({
    secret: process.env.SESSION_SECRET || "sua_chave_secreta",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    },
  })
);

// Initialize Prisma Client
const prisma = new PrismaClient();

// Configuração do EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware para disponibilizar a sessão do usuário para todas as views
app.use(setCommonVariables);

// Middleware para carregar notificações para as views (apenas se o usuário estiver logado e não em rota de API)
app.use(async (req, res, next) => {
  res.locals.notifications = [];
  res.locals.unreadCount = 0;

  if (req.session.user) {
    const isApiRoute = req.path.startsWith("/api/") || req.path.startsWith("/chat/api/");
    const isAuthRoute = req.path.startsWith("/auth/");
    const isPublicRoute = req.path === "/" || req.path.startsWith("/access-denied") || req.path.startsWith("/account-blocked") || req.path.startsWith("/pending-approval");

    if (!isApiRoute && !isAuthRoute && !isPublicRoute) {
      try {
        const notifications = await getUnreadNotifications(req.session.user.id);
        res.locals.notifications = notifications;
        res.locals.unreadCount = notifications.length;
      } catch (error) {
        console.error("Erro ao carregar notificações para views:", error);
      }
    }
  }
  next();
});

// Rota de acesso negado
app.get("/access-denied", (req, res) => {
  res.render("access-denied", { error: "Acesso negado. Você não tem permissão para acessar esta página." });
});

// Rota para a página de conta bloqueada
app.get("/account-blocked", (req, res) => {
  res.render("account-blocked");
});

// Adicionar rota para a página de aprovação pendente
app.get("/pending-approval", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  res.render("pending-approval");
});

// Rota principal
app.get("/", (req, res) => {
  res.render("index");
});

// Rotas da aplicação
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/admin", adminRoutes);
app.use("/jobs", jobRoutes);
app.use("/chat", chatRoutes);
app.use("/notifications", notificationRoutes);

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    error: "Ocorreu um erro no servidor.",
    details: process.env.NODE_ENV === "development" ? err.message : null,
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).render("error", { error: "Página não encontrada." });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;