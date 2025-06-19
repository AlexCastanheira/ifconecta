// src/models/notification.js
import prisma from "../config/prismaClient.js";
import { sendEmail, emailTemplates } from "../services/emailService.js";

/**
 * Cria uma nova notificação no banco de dados.
 * @param {number} userId - ID do usuário que receberá a notificação
 * @param {string} message - Mensagem da notificação
 * @param {string} type - Tipo da notificação (job_match, application, message, etc)
 * @param {number|string|null} relatedId - ID relacionado (ex: ID da vaga, ID do chat)
 * @returns {Promise<object>} A notificação criada
 */
export async function createNotification(userId, message, type, relatedId = null) {
  try {
    const data = {
      userId,
      message,
      type,
      relatedId: relatedId ? String(relatedId) : null,
      read: false,
    };

    const notification = await prisma.notification.create({ data });
    return notification;
  } catch (error) {
    console.error("Erro ao criar notificação no DB:", error);
    throw error;
  }
}

export async function getUnreadNotifications(userId) {
  return prisma.notification.findMany({
    where: {
      userId,
      read: false,
      createdAt: { lte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllNotifications(userId, limit = 50) {
  return prisma.notification.findMany({
    where: {
      userId,
      createdAt: { lte: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationAsRead(notificationId) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function markAllNotificationsAsRead(userId) {
  return prisma.notification.updateMany({
    where: {
      userId,
      read: false,
      createdAt: { lte: new Date() },
    },
    data: { read: true },
  });
}

export async function calculateMatchPercentage(student, job) {
  const studentBadgeIds = student.badges?.map((ub) => ub.badgeId) || [];
  const jobRequirementIds = (job.requirements || job.requiredBadges || []).map(
    (req) => req.badgeId
  );

  if (!studentBadgeIds.length || !jobRequirementIds.length) return 0;

  const matchingBadges = studentBadgeIds.filter((id) =>
    jobRequirementIds.includes(id)
  );
  return Math.round((matchingBadges.length / jobRequirementIds.length) * 100);
}

export async function sendNotificationEmail(notification, user, relatedData = {}) {
  try {
    if (!user) {
      console.warn(`sendNotificationEmail: Usuário não encontrado para notificação ${notification.id}`);
      return;
    }

    switch (notification.type) {
      case "job_match":
        if (user.emailJobNotifications) {
          const job = relatedData.job || await prisma.job.findUnique({ where: { id: Number(notification.relatedId) } });
          if (job) {
            await sendEmail(user.email, "Nova Vaga Disponível - IF Conecta", emailTemplates.newJob(job));
          }
        }
        break;
      case "message":
        if (user.emailMessageNotifications) {
          const senderNameMatch = notification.message.match(/de (.+)/);
          const senderName = senderNameMatch?.[1] || "Alguém";
          const chatId = notification.relatedId;
          if (chatId) {
            await sendEmail(user.email, "Nova Mensagem Recebida - IF Conecta", emailTemplates.newMessage(senderName, chatId));
          }
        }
        break;
      case "application":
        if (user.emailApplicationNotifications) {
          const job = relatedData.job || await prisma.job.findUnique({ where: { id: Number(notification.relatedId) } });
          const studentNameMatch = notification.message.match(/O candidato "([^"]+)"/);
          const jobTitleMatch = notification.message.match(/para a vaga "([^"]+)"/);
          const studentName = studentNameMatch ? studentNameMatch[1] : "Um candidato";
          const jobTitle = jobTitleMatch ? jobTitleMatch[1] : (job ? job.title : "uma vaga");
          if (job) {
            await sendEmail(user.email, "Nova Candidatura Recebida - IF Conecta", emailTemplates.newApplication(jobTitle, studentName, job.id));
          }
        }
        break;
      case "ACCOUNT_APPROVED":
        if (user.emailPasswordReset) {
          await sendEmail(user.email, "Sua Conta IF Conecta Foi Aprovada!", `
            <p>Olá ${user.name},</p>
            <p>Sua conta de empregador no IF Conecta foi aprovada! Agora você pode publicar vagas e interagir com estudantes.</p>
            <p>Acesse a plataforma: <a href="${process.env.BASE_URL}/auth/login">${process.env.BASE_URL}/auth/login</a></p>
          `);
        }
        break;
      case "ACCOUNT_BLOCKED":
        if (user.emailPasswordReset) {
          await sendEmail(user.email, "Sua Conta IF Conecta Foi Bloqueada", `
            <p>Olá ${user.name},</p>
            <p>Sua conta no IF Conecta foi bloqueada. Entre em contato com o suporte para mais informações.</p>
          `);
        }
        break;
      case "ACCOUNT_UNBLOCKED":
        if (user.emailPasswordReset) {
          await sendEmail(user.email, "Sua Conta IF Conecta Foi Desbloqueada", `
            <p>Olá ${user.name},</p>
            <p>Sua conta no IF Conecta foi desbloqueada. Você pode voltar a usar a plataforma normalmente.</p>
          `);
        }
        break;
    }
  } catch (error) {
    console.error(`Erro ao enviar e-mail para notificação ${notification.id} (Tipo: ${notification.type}):`, error);
  }
}

export async function notifyNewJob(job, studentsWithMatchCount) {
  const notifications = [];
  for (const student of studentsWithMatchCount) {
    const percentage = Math.round((student.matchCount / job.requirements.length) * 100);
    const notification = await createNotification(
      student.id,
      `Vaga publicada pela empresa "${job.employer.name}": você se qualifica ${percentage}% para a vaga "${job.title}"`,
      "job_match",
      job.id
    );
    notifications.push(notification);
    await sendNotificationEmail(notification, student, { job });
  }
  return notifications;
}

export async function notifyNewApplication(application, job, student) {
  const studentWithBadges = await prisma.user.findUnique({ where: { id: student.id }, include: { badges: true } });
  const jobWithRequirements = await prisma.job.findUnique({ where: { id: job.id }, include: { requirements: true } });
  const percentage = await calculateMatchPercentage(studentWithBadges, jobWithRequirements);
  const notification = await createNotification(
    job.employerId,
    `O candidato "${student.name}" se aplica ${percentage}% para a vaga "${job.title}"`,
    "application",
    job.id
  );
  await sendNotificationEmail(notification, await prisma.user.findUnique({ where: { id: job.employerId } }), { job, student });
  return notification;
}

export async function notifyNewMessage(message, chat, sender, recipient) {
  const notification = await createNotification(recipient.id, `Nova mensagem de ${sender.name}`, "message", chat.id);
  await sendNotificationEmail(notification, recipient, { chat, sender });
  return notification;
}