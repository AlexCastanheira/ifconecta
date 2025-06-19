// src/controllers/chatController.js
import prisma from "../config/prismaClient.js";
import { createNotification, sendNotificationEmail } from "../models/notification.js"; // Importar ambas as funções


// Iniciar um novo chat (apenas empregadores podem iniciar)
export const startChat = async (req, res) => {
  const { studentId, jobId } = req.body;
  const employerId = req.session.user.id;

  if (req.session.user.type.toLowerCase() !== "employer") {
    return res.status(403).json({ message: "Apenas empregadores podem iniciar chats." });
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: Number(jobId) },
    });

    if (!job || job.employerId !== employerId) {
      return res.status(403).json({ message: "Você não tem permissão para iniciar um chat para esta vaga." });
    }

    const application = await prisma.jobApplication.findFirst({
      where: {
        jobId: Number(jobId),
        studentId: Number(studentId),
      },
    });

    if (!application) {
      return res.status(400).json({ message: "O estudante não se candidatou a esta vaga." });
    }

    const existingChat = await prisma.chat.findFirst({
      where: {
        jobId: Number(jobId),
        employerId,
        studentId: Number(studentId),
      },
    });

    if (existingChat) {
      return res.status(200).json({ chatId: existingChat.id });
    }

    const chat = await prisma.chat.create({
      data: {
        jobId: Number(jobId),
        employerId,
        studentId: Number(studentId),
        initiatedBy: employerId,
      },
    });

    const student = await prisma.user.findUnique({ where: { id: Number(studentId) } });
    if (student) {
      const notification = await createNotification(
        student.id,
        `Um empregador iniciou um chat com você sobre a vaga "${job.title}".`,
        "chat_initiated",
        chat.id
      );
      await sendNotificationEmail(notification, student, { chat, job });
    }

    res.status(201).json({ chatId: chat.id });
  } catch (error) {
    console.error("Erro ao iniciar chat:", error);
    res.status(500).json({ message: "Erro ao iniciar chat." });
  }
};

// Iniciar um novo chat como admin
export const startAdminChat = async (req, res) => {
  const { userId } = req.body;
  const adminId = req.session.user.id;

  if (req.session.user.type.toLowerCase() !== "admin") {
    return res.status(403).json({ message: "Apenas administradores podem usar esta funcionalidade." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    let existingChat;

    if (user.type.toLowerCase() === "student") {
      existingChat = await prisma.chat.findFirst({
        where: {
          employerId: adminId,
          studentId: Number(userId),
          jobId: null,
        },
      });
    } else if (user.type.toLowerCase() === "employer") {
      existingChat = await prisma.chat.findFirst({
        where: {
          employerId: Number(userId),
          studentId: adminId,
          jobId: null,
        },
      });
    }

    if (existingChat) {
      return res.status(200).json({ chatId: existingChat.id });
    }

    let chat;

    if (user.type.toLowerCase() === "student") {
      chat = await prisma.chat.create({
        data: {
          jobId: null,
          employerId: adminId,
          studentId: Number(userId),
          initiatedBy: adminId,
        },
      });
    } else if (user.type.toLowerCase() === "employer") {
      chat = await prisma.chat.create({
        data: {
          jobId: null,
          employerId: Number(userId),
          studentId: adminId,
          initiatedBy: adminId,
        },
      });
    }

    if (chat) {
      const notification = await createNotification(
        Number(userId),
        "Um administrador iniciou um chat com você.",
        "admin_chat",
        chat.id
      );
      await sendNotificationEmail(notification, user, { chat });
    }

    res.status(201).json({ chatId: chat.id });
  } catch (error) {
    console.error("Erro ao iniciar chat administrativo:", error);
    res.status(500).json({ message: "Erro ao iniciar chat administrativo." });
  }
};

// Obter todos os chats do usuário
export const getUserChats = async (req, res) => {
  const userId = req.session.user.id;
  const userType = req.session.user.type.toLowerCase();

  try {
    let chats;

    if (userType === "employer" || userType === "admin") {
      chats = await prisma.chat.findMany({
        where: { employerId: userId },
        include: {
          job: true,
          student: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    } else if (userType === "student" || userType === "admin") {
      chats = await prisma.chat.findMany({
        where: { studentId: userId },
        include: {
          job: true,
          employer: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    } else {
      return res.status(403).json({ message: "Tipo de usuário não suportado." });
    }

    res.json(chats);
  } catch (error) {
    console.error("Erro ao buscar chats:", error);
    res.status(500).json({ message: "Erro ao buscar chats." });
  }
};

// Obter mensagens de um chat específico
export const getChatMessages = async (req, res) => {
  const chatId = Number(req.params.chatId);
  const userId = req.session.user.id;

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (
      !chat ||
      (chat.employerId !== userId && chat.studentId !== userId && req.session.user.type.toLowerCase() !== "admin")
    ) {
      return res.status(403).json({ message: "Você não tem permissão para acessar este chat." });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      include: { sender: true },
      orderBy: { createdAt: "asc" },
    });

    await prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    res.json(messages);
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    res.status(500).json({ message: "Erro ao buscar mensagens." });
  }
};

// Enviar uma mensagem
export const sendMessage = async (req, res) => {
  const chatId = Number(req.params.chatId);
  const { content } = req.body;
  const senderId = req.session.user.id;

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (
      !chat ||
      (chat.employerId !== senderId && chat.studentId !== senderId && req.session.user.type.toLowerCase() !== "admin")
    ) {
      return res.status(403).json({ message: "Você não tem permissão para enviar mensagens neste chat." });
    }

    if (chat.status === "CLOSED") {
      return res.status(400).json({ message: "Este chat foi encerrado e não aceita mais mensagens." });
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        content,
      },
      include: { sender: true },
    });

    const recipientId = senderId === chat.employerId ? chat.studentId : chat.employerId;

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
    });

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    const notification = await createNotification(recipientId, `Nova mensagem de ${sender.name}`, "message", chat.id);
    await sendNotificationEmail(notification, recipient, { chat, sender });

    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    res.status(500).json({ message: "Erro ao enviar mensagem." });
  }
};

// Encerrar um chat
export const closeChat = async (req, res) => {
  const chatId = Number(req.params.chatId);
  const userId = req.session.user.id;
  const userType = req.session.user.type.toLowerCase();

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        employer: true,
        student: true,
      },
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado." });
    }

    let canClose = false;

    if (chat.employerId === userId || chat.studentId === userId) {
      if (chat.initiatedBy) {
        const initiator = await prisma.user.findUnique({
          where: { id: chat.initiatedBy },
          select: { type: true },
        });

        if (initiator && initiator.type.toLowerCase() === "admin") {
          canClose = userId === chat.initiatedBy;
        } else {
          canClose = true;
        }
      } else {
        canClose = true;
      }
    }

    if (userType === "admin" && chat.initiatedBy === userId) {
      canClose = true;
    }

    if (!canClose) {
      return res.status(403).json({ message: "Você não tem permissão para encerrar este chat." });
    }

    if (chat.status === "CLOSED") {
      return res.status(400).json({ message: "Este chat já está encerrado." });
    }

    await prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content: `Chat encerrado por ${req.session.user.name}.`,
        isSystemMessage: true,
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedBy: userId,
      },
    });

    const otherUserId = userId === chat.employerId ? chat.studentId : chat.employerId;
    const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } });

    const notification = await createNotification(otherUserId, `O chat foi encerrado por ${req.session.user.name}.`, "chat_closed", String(chatId));
    await sendNotificationEmail(notification, otherUser, { chat });

    res.status(200).json({ message: "Chat encerrado com sucesso." });
  } catch (error) {
    console.error("Erro ao encerrar chat:", error);
    res.status(500).json({ message: "Erro ao encerrar chat." });
  }
};

// Reativar um chat
export const reactivateChat = async (req, res) => {
  const chatId = Number(req.params.chatId);
  const userId = req.session.user.id;
  const userType = req.session.user.type.toLowerCase();

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        employer: true,
        student: true,
      },
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat não encontrado." });
    }

    if (chat.status !== "CLOSED") {
      return res.status(400).json({ message: "Este chat já está ativo." });
    }

    let canReactivate = false;

    if (userType === "employer" && chat.employerId === userId) {
      if (chat.initiatedBy) {
        const initiator = await prisma.user.findUnique({
          where: { id: chat.initiatedBy },
          select: { type: true },
        });

        if (initiator && initiator.type.toLowerCase() === "admin") {
          canReactivate = false;
        } else {
          canReactivate = true;
        }
      } else {
        canReactivate = true;
      }
    }

    if (userType === "admin" && chat.initiatedBy === userId) {
      canReactivate = true;
    }

    if (!canReactivate) {
      return res.status(403).json({ message: "Você não tem permissão para reativar este chat." });
    }

    await prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content: `Chat reativado por ${req.session.user.name}.`,
        isSystemMessage: true,
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: {
        status: "ACTIVE",
        closedAt: null,
        closedBy: null,
      },
    });

    const otherUserId = userId === chat.employerId ? chat.studentId : chat.employerId;
    const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } });

    const notification = await createNotification(otherUserId, `O chat foi reativado por ${req.session.user.name}.`, "chat_reactivated", String(chatId));
    await sendNotificationEmail(notification, otherUser, { chat });

    res.status(200).json({ message: "Chat reativado com sucesso." });
  } catch (error) {
    console.error("Erro ao reativar chat:", error);
    res.status(500).json({ message: "Erro ao reativar chat." });
  }
};

// Renderizar a interface integrada de chat
export const renderChatInterface = async (req, res) => {
  const userId = req.session.user.id;
  const userType = req.session.user.type.toLowerCase();
  const selectedChatId = req.query.chatId ? Number(req.query.chatId) : null;

  try {
    let chats = [];

    if (userType === "admin") {
      const chatsAsEmployer = await prisma.chat.findMany({
        where: { employerId: userId },
        include: {
          job: true,
          student: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const chatsAsStudent = await prisma.chat.findMany({
        where: { studentId: userId },
        include: {
          job: true,
          employer: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      chats = [...chatsAsEmployer, ...chatsAsStudent].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    } else if (userType === "employer") {
      chats = await prisma.chat.findMany({
        where: { employerId: userId },
        include: {
          job: true,
          student: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    } else if (userType === "student") {
      chats = await prisma.chat.findMany({
        where: { studentId: userId },
        include: {
          job: true,
          employer: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    } else {
      return res.redirect("/access-denied");
    }

    for (const chat of chats) {
      chat.unreadCount = await prisma.message.count({
        where: {
          chatId: chat.id,
          senderId: { not: userId },
          read: false,
        },
      });
    }

    let selectedChat = null;
    let otherUser = null;
    let canReactivate = false;
    let canClose = false;

    if (selectedChatId) {
      selectedChat = await prisma.chat.findUnique({
        where: { id: selectedChatId },
        include: {
          job: true,
          employer: true,
          student: true,
          initiator: true,
        },
      });

      if (
        !selectedChat ||
        (selectedChat.employerId !== userId && selectedChat.studentId !== userId && userType !== "admin")
      ) {
        return res.redirect("/access-denied");
      }

      const isEmployer = selectedChat.employerId === userId || (userType === "admin" && selectedChat.studentId !== userId);
      otherUser = isEmployer ? selectedChat.student : selectedChat.employer;

      const isClosed = selectedChat.status === "CLOSED";

      if (isClosed && userType === "employer" && selectedChat.employerId === userId) {
        if (selectedChat.initiatedBy) {
          const initiator = await prisma.user.findUnique({
            where: { id: selectedChat.initiatedBy },
            select: { type: true },
          });

          if (initiator && initiator.type.toLowerCase() === "admin") {
            canReactivate = false;
          } else {
            canReactivate = true;
          }
        } else {
          canReactivate = true;
        }
      }

      if (isClosed && userType === "admin" && selectedChat.initiatedBy === userId) {
        canReactivate = true;
      }

      if (!isClosed && (selectedChat.employerId === userId || selectedChat.studentId === userId)) {
        if (selectedChat.initiatedBy) {
          const initiator = await prisma.user.findUnique({
            where: { id: selectedChat.initiatedBy },
            select: { type: true },
          });

          if (initiator && initiator.type.toLowerCase() === "admin") {
            canClose = userId === selectedChat.initiatedBy;
          } else {
            canClose = true;
          }
        } else {
          canClose = true;
        }
      }

      if (!isClosed && userType === "admin" && selectedChat.initiatedBy === userId) {
        canClose = true;
      }

      await prisma.message.updateMany({
        where: {
          chatId: selectedChatId,
          senderId: { not: userId },
          read: false,
        },
        data: { read: true },
      });
    }

    res.render("chatInterface", {
      chats,
      selectedChat,
      selectedChatId,
      otherUser,
      userType,
      canReactivate,
      canClose,
      user: req.session.user,
      error: null,
    });
  } catch (error) {
    console.error("Erro ao renderizar interface de chat:", error);
    res.status(500).render("error", { error: "Erro ao carregar interface de chat." });
  }
};

// Renderizar a página de chat (para compatibilidade com AJAX)
export const renderChat = async (req, res) => {
  const chatId = Number(req.params.chatId);
  const userId = req.session.user.id;
  const userType = req.session.user.type.toLowerCase();
  const isAjax = req.query.ajax === "true";

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        job: true,
        employer: true,
        student: true,
        initiator: true,
      },
    });

    if (!chat || (chat.employerId !== userId && chat.studentId !== userId && userType !== "admin")) {
      return res.redirect("/access-denied");
    }

    const isEmployer = chat.employerId === userId || (userType === "admin" && chat.studentId !== userId);
    const otherUser = isEmployer ? chat.student : chat.employer;

    const isClosed = chat.status === "CLOSED";

    let canReactivate = false;

    if (isClosed && userType === "employer" && chat.employerId === userId) {
      if (chat.initiatedBy) {
        const initiator = await prisma.user.findUnique({
          where: { id: chat.initiatedBy },
          select: { type: true },
        });

        if (initiator && initiator.type.toLowerCase() === "admin") {
          canReactivate = false;
        } else {
          canReactivate = true;
        }
      } else {
        canReactivate = true;
      }
    }

    if (isClosed && userType === "admin" && chat.initiatedBy === userId) {
      canReactivate = true;
    }

    let canClose = false;

    if (!isClosed && (chat.employerId === userId || chat.studentId === userId)) {
      if (chat.initiatedBy) {
        const initiator = await prisma.user.findUnique({
          where: { id: chat.initiatedBy },
          select: { type: true },
        });

        if (initiator && initiator.type.toLowerCase() === "admin") {
          canClose = userId === chat.initiatedBy;
        } else {
          canClose = true;
        }
      } else {
        canClose = true;
      }
    }

    if (!isClosed && userType === "admin" && chat.initiatedBy === userId) {
      canClose = true;
    }

    if (isAjax) {
      return res.render("chatContent", {
        chat,
        isEmployer,
        otherUser,
        isClosed,
        isAdmin: userType === "admin",
        canReactivate,
        canClose,
        user: req.session.user,
      });
    }

    return res.redirect(`/chat/interface?chatId=${chatId}`);
  } catch (error) {
    console.error("Erro ao renderizar chat:", error);
    if (req.query.ajax === "true") {
      return res.status(500).send('<div class="error-message">Erro ao carregar chat.</div>');
    }
    res.status(500).render("error", { error: "Erro ao carregar chat." });
  }
};

// Renderizar a lista de chats (para compatibilidade)
export const renderChatsList = async (req, res) => {
  res.redirect("/chat/interface");
};