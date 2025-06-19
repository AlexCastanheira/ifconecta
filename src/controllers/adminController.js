import prisma from "../config/prismaClient.js";
import { createNotification, sendNotificationEmail } from "../models/notification.js";

const BADGE_CATEGORIES = [
    { value: "programming", label: "Programação" },
    { value: "frontend", label: "Frontend" },
    { value: "backend", label: "Backend" },
    { value: "database", label: "Banco de Dados" },
    { value: "devops", label: "DevOps" },
    { value: "other", label: "Outro" }
];

async function getBadgeFormData(initialError = null, initialSuccess = null) {
    const existingBadges = await prisma.badge.findMany({
        orderBy: { name: "asc" },
    });
    return {
        error: initialError,
        success: initialSuccess,
        existingBadges,
        badgeCategories: BADGE_CATEGORIES,
    };
}

export const getDashboard = async (req, res) => {
    try {
        const studentsCount = await prisma.user.count({
            where: {
                type: "student",
            },
        });

        const employersCount = await prisma.user.count({
            where: {
                type: "employer",
                status: true,
            },
        });

        const pendingEmployers = await prisma.user.count({
            where: {
                type: "employer",
                status: false,
            },
        });

        const jobsCount = await prisma.job.count();

        res.render("dashboard", {
            studentsCount,
            employersCount,
            pendingEmployers,
            jobsCount,
            error: null,
        });
    } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
        res.status(500).render("error", {
            error: "Erro ao carregar dashboard",
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
};

export const getStudents = async (req, res) => {
    try {
        const students = await prisma.user.findMany({
            where: {
                type: "student",
            },
            orderBy: {
                name: "asc",
            },
        });

        res.render("students-list", {
            students,
            error: null,
        });
    } catch (error) {
        console.error("Erro ao listar estudantes:", error);
        res.status(500).render("error", {
            error: "Erro ao listar estudantes",
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
};

export const getEmployers = async (req, res) => {
    try {
        const employers = await prisma.user.findMany({
            where: {
                type: "employer",
                status: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        res.render("employers-list", {
            employers,
            error: null,
        });
    } catch (error) {
        console.error("Erro ao listar empregadores:", error);
        res.status(500).render("error", {
            error: "Erro ao listar empregadores",
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
};

export const getPendingEmployers = async (req, res) => {
    try {
        const pendingEmployers = await prisma.user.findMany({
            where: {
                type: "employer",
                status: false,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        res.render("pending-employers", {
            employers: pendingEmployers,
            error: null,
        });
    } catch (error) {
        console.error("Erro ao listar empregadores pendentes:", error);
        res.status(500).render("error", {
            error: "Erro ao listar empregadores pendentes",
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
};

export const getJobs = async (req, res) => {
    try {
        const jobs = await prisma.job.findMany({
            include: {
                employer: true,
                applications: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        res.render("jobs-list", {
            jobs,
            error: null,
        });
    } catch (error) {
        console.error("Erro ao listar vagas:", error);
        res.status(500).render("error", {
            error: "Erro ao listar vagas",
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
};

export const approveEmployer = async (req, res) => {
    const { id } = req.params;

    try {
        const approvedUser = await prisma.user.update({
            where: { id: Number.parseInt(id) },
            data: { status: true },
        });

        await prisma.adminLog.create({
            data: {
                adminId: req.session.user.id,
                action: `EMPLOYER_APPROVED:${id}`,
            },
        });

        const notification = await createNotification(
            Number.parseInt(id),
            "Sua conta foi aprovada! Agora você pode publicar vagas e interagir com estudantes.",
            "ACCOUNT_APPROVED",
            null
        );
        await sendNotificationEmail(notification, approvedUser);

        res.redirect("/admin/pending-employers");
    } catch (error) {
        console.error("Erro ao aprovar empregador:", error);
        res.status(500).render("error", {
            error: "Erro ao aprovar empregador",
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
};

export const rejectEmployer = async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.adminLog.create({
            data: {
                adminId: req.session.user.id,
                action: `EMPLOYER_REJECTED:${id}`,
            },
        });

        await prisma.user.delete({
            where: { id: Number.parseInt(id) },
        });

        res.redirect("/admin/pending-employers");
    } catch (error) {
        console.error("Erro ao rejeitar empregador:", error);
        res.status(500).render("error", {
            error: "Erro ao rejeitar empregador",
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
};

export const toggleUserStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const newStatus = status === "true" || status === true;

        const updatedUser = await prisma.user.update({
            where: { id: Number.parseInt(id) },
            data: { status: newStatus },
        });

        const action = newStatus ? "USER_UNBLOCKED" : "USER_BLOCKED";
        await prisma.adminLog.create({
            data: {
                adminId: req.session.user.id,
                action: `${action}:${id}`,
            },
        });

        const notificationType = newStatus ? "ACCOUNT_UNBLOCKED" : "ACCOUNT_BLOCKED";
        const notificationMessage = newStatus
            ? "Sua conta foi desbloqueada. Você pode voltar a usar a plataforma normalmente."
            : "Sua conta foi bloqueada. Entre em contato com o suporte para mais informações.";

        const notification = await createNotification(
            Number.parseInt(id),
            notificationMessage,
            notificationType,
            null
        );
        await sendNotificationEmail(notification, updatedUser);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erro ao alternar status do usuário:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao alternar status do usuário",
        });
    }
};

export const deleteJob = async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.job.delete({
            where: { id: Number.parseInt(id) },
        });

        await prisma.adminLog.create({
            data: {
                adminId: req.session.user.id,
                action: `JOB_DELETED:${id}`,
            },
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erro ao excluir vaga:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao excluir vaga",
        });
    }
};

export const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.user.delete({
            where: { id: Number.parseInt(id) },
        });

        await prisma.adminLog.create({
            data: {
                adminId: req.session.user.id,
                action: `USER_DELETED:${id}`,
            },
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        res.status(500).json({
            success: false,
            error: "Erro ao excluir usuário",
        });
    }
};

const formatDate = (date) => {
    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

export const getReports = async (req, res) => {
    try {
        let { startDate, endDate } = req.query;

        if (!startDate) {
            const defaultStartDate = new Date();
            defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 1);
            startDate = defaultStartDate.toISOString().split("T")[0];
        }

        if (!endDate) {
            const defaultEndDate = new Date();
            endDate = defaultEndDate.toISOString().split("T")[0];
        }

        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);

        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);

        const formattedStartDate = formatDate(startDateTime);
        const formattedEndDate = formatDate(endDateTime);

        const dateFilter = {
            createdAt: {
                gte: startDateTime,
                lte: endDateTime,
            },
        };

        let topRequirements = await prisma.$queryRaw`
      SELECT b.name, COUNT(*) as count
      FROM "JobRequirement" jr
      JOIN "Badge" b ON jr."badgeId" = b.id
      JOIN "Job" j ON jr."jobId" = j.id
      WHERE j."createdAt" >= ${startDateTime} AND j."createdAt" <= ${endDateTime}
      GROUP BY b.name
      ORDER BY count DESC
      LIMIT 10
    `;

        topRequirements = topRequirements.map((item) => ({
            name: item.name,
            count: Number(item.count),
        }));

        let topStudentSkills = await prisma.$queryRaw`
      SELECT b.name, COUNT(*) as count
      FROM "UserBadge" ub
      JOIN "Badge" b ON ub."badgeId" = b.id
      JOIN "User" u ON ub."userId" = u.id
      WHERE u.type = 'student' AND ub."createdAt" >= ${startDateTime} AND ub."createdAt" <= ${endDateTime}
      GROUP BY b.name
      ORDER BY count DESC
      LIMIT 10
    `;

        topStudentSkills = topStudentSkills.map((item) => ({
            name: item.name,
            count: Number(item.count),
        }));

        const studentsCount = await prisma.user.count({
            where: {
                type: "student",
            },
        });

        const jobRequirements = await prisma.$queryRaw`
      SELECT b.name, COUNT(*) as job_count
      FROM "JobRequirement" jr
      JOIN "Badge" b ON jr."badgeId" = b.id
      GROUP BY b.name
      ORDER BY job_count DESC
    `;

        const studentSkills = await prisma.$queryRaw`
      SELECT b.name, COUNT(*) as student_count
      FROM "UserBadge" ub
      JOIN "Badge" b ON ub."badgeId" = b.id
      JOIN "User" u ON ub."userId" = u.id
      WHERE u.type = 'student'
      GROUP BY b.name
    `;

        const jobReqMap = {};
        jobRequirements.forEach((item) => {
            jobReqMap[item.name] = Number(item.job_count);
        });

        const studentSkillMap = {};
        studentSkills.forEach((item) => {
            studentSkillMap[item.name] = Number(item.student_count);
        });

        const skillsMatchAnalysis = Object.keys(jobReqMap)
            .map((name) => ({
                name,
                job_count: jobReqMap[name],
                student_count: studentSkillMap[name] || 0,
                student_percentage: studentSkillMap[name] ? Math.round((studentSkillMap[name] * 100) / studentsCount) : 0,
            }))
            .sort((a, b) => b.job_count - a.job_count)
            .slice(0, 10);

        let applicationRates = await prisma.$queryRaw`
      SELECT j.title, j.id as job_id, COUNT(ja.id) as application_count, j."createdAt" as job_date
      FROM "Job" j
      LEFT JOIN "JobApplication" ja ON j.id = ja."jobId"
      WHERE ja."createdAt" >= ${startDateTime} AND ja."createdAt" <= ${endDateTime}
      GROUP BY j.id, j.title, j."createdAt"
      ORDER BY application_count DESC
      LIMIT 10
    `;

        applicationRates = applicationRates.map((item) => ({
            title: item.title,
            job_id: item.job_id,
            application_count: Number(item.application_count),
            job_date: item.job_date,
        }));

        const jobsCount = await prisma.job.count({
            where: dateFilter,
        });

        const studentsNewCount = await prisma.user.count({
            where: {
                ...dateFilter,
                type: "student",
            },
        });

        const employersCount = await prisma.user.count({
            where: {
                ...dateFilter,
                type: "employer",
            },
        });

        const applicationsCount = await prisma.jobApplication.count({
            where: dateFilter,
        });

        const periodSummary = {
            jobsCount,
            studentsCount: studentsNewCount,
            employersCount,
            applicationsCount,
        };

        console.log("Dados coletados:", {
            topRequirements: topRequirements.length,
            topStudentSkills: topStudentSkills.length,
            skillsMatchAnalysis: skillsMatchAnalysis.length,
            applicationRates: applicationRates.length,
            periodSummary,
        });

        const hasData = {
            topRequirements: topRequirements.length > 0,
            topStudentSkills: topStudentSkills.length > 0,
            skillsMatchAnalysis: skillsMatchAnalysis.length > 0,
            applicationRates: applicationRates.length > 0,
        };

        res.render("adminReports", {
            topRequirements: topRequirements || [],
            topStudentSkills: topStudentSkills || [],
            skillsMatchAnalysis: skillsMatchAnalysis || [],
            applicationRates: applicationRates || [],
            periodSummary,
            startDate,
            endDate,
            formattedStartDate,
            formattedEndDate,
            hasData,
            error: null,
        });
    } catch (error) {
        console.error("Erro ao gerar relatórios:", error);
        res.status(500).render("error", {
            error: "Erro ao gerar relatórios",
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
};

export const renderAddBadgeForm = async (req, res) => {
    try {
        const data = await getBadgeFormData();
        res.render("add-badge", data);
    } catch (error) {
        console.error("Erro ao carregar formulário de adicionar badge:", error);
        res.status(500).render("error", {
            error: "Erro ao carregar formulário de adicionar badge",
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
};

export const addBadge = async (req, res) => {
    const { name, description, category } = req.body;

    try {
        if (!name || name.trim() === "") {
            const data = await getBadgeFormData("O nome da habilidade é obrigatório.");
            return res.status(400).render("add-badge", data);
        }

        if (!category || !BADGE_CATEGORIES.some(cat => cat.value === category)) {
            const data = await getBadgeFormData("Categoria de habilidade inválida.");
            return res.status(400).render("add-badge", data);
        }

        const formattedName = name.trim().toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

        const existingBadge = await prisma.badge.findUnique({
            where: { name: formattedName },
        });

        if (existingBadge) {
            const data = await getBadgeFormData(`A habilidade "${formattedName}" já existe.`);
            return res.status(409).render("add-badge", data);
        }

        const newBadge = await prisma.badge.create({
            data: {
                name: formattedName,
                description: description || null,
                category: category,
            },
        });

        await prisma.adminLog.create({
            data: {
                adminId: req.session.user.id,
                action: `BADGE_ADDED:${newBadge.name} (${newBadge.category})`,
            },
        });

        const data = await getBadgeFormData(`Habilidade "${newBadge.name}" adicionada com sucesso!`, true);
        res.render("add-badge", data);
    } catch (error) {
        console.error("Erro ao adicionar badge:", error);
        const data = await getBadgeFormData("Erro ao adicionar habilidade. Tente novamente.", null);
        res.status(500).render("add-badge", {
            ...data,
            details: process.env.NODE_ENV === "development" ? error.message : null,
        });
    }
};