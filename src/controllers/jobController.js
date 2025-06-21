// src/controllers/jobController.js

import prisma from "../config/prismaClient.js";
import { createNotification, sendNotificationEmail, notifyNewJob, notifyNewApplication } from "../models/notification.js";

export const renderCreateJobForm = async (req, res) => {
  if (req.session.user.type.toLowerCase() !== "employer") {
    return res.redirect("/access-denied");
  }

  try {
    const availableBadges = await prisma.badge.findMany({
      orderBy: { name: "asc" },
    });

    res.render("createJob", {
      error: null,
      availableBadges,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("error", {
      error: "Erro ao carregar formulário de criação de vaga.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    });
  }
};

export const renderEditJobForm = async (req, res) => {
  if (req.session.user.type.toLowerCase() !== "employer") {
    return res.redirect("/access-denied");
  }

  const jobId = Number.parseInt(req.params.id);

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        requirements: true,
      },
    });

    if (!job) {
      return res.status(404).render("error", { error: "Vaga não encontrada." });
    }

    if (job.employerId !== req.session.user.id) {
      return res.redirect("/access-denied");
    }

    const availableBadges = await prisma.badge.findMany({
      orderBy: { name: "asc" },
    });

    res.render("editJob", {
      job,
      availableBadges,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("error", {
      error: "Erro ao carregar formulário de edição de vaga.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    });
  }
};

export const renderJobsList = async (req, res) => {
  try {
    const filter = req.query.filter || "open";
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const contractType = req.query.contractType || '';
    const requirement = req.query.requirement || '';

    const skip = (page - 1) * limit;

    const isEmployer = req.session.user && req.session.user.type.toLowerCase() === "employer";
    const isStudent = req.session.user && req.session.user.type.toLowerCase() === "student";

    // Inicia um array para as condições AND
    let conditions = [];

    // Adiciona o filtro de tipo de contrato
    if (contractType) {
      conditions.push({ contractType: contractType });
    }

    // Adiciona o filtro de requisito (Badge)
    if (requirement) {
      conditions.push({
        requirements: {
          some: {
            name: requirement // Agora o nome vem com a capitalização correta do EJS
          }
        }
      });
    }

    // Adiciona a condição de pesquisa geral
    if (search) {
      const searchOrConditions = [
        { title: { contains: search } },
        { description: { contains: search } },
        { employer: { name: { contains: search } } },
        { requirements: { some: { name: { contains: search } } } }
      ];
      conditions.push({ OR: searchOrConditions });
    }

    // Adiciona o filtro de status da vaga (exceto se for "all")
    if (filter === "open") {
      conditions.push({ status: true });
    } else if (filter === "closed") {
      conditions.push({ status: false });
    }

    let jobs = [];
    let totalJobs = 0;

    // Define a cláusula WHERE final
    let finalWhereClause = conditions.length > 0 ? { AND: conditions } : {};

    if (isEmployer) {
      finalWhereClause.employerId = req.session.user.id; // Garante que é do próprio empregador

      jobs = await prisma.job.findMany({
        where: finalWhereClause,
        include: {
          employer: true,
          requirements: true,
          applications: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });
      totalJobs = await prisma.job.count({ where: finalWhereClause });
    } else if (isStudent && filter === "applied") {
      // Para o filtro 'applied', a lógica precisa ser um pouco diferente,
      // pois os filtros e pesquisa se aplicam à vaga relacionada à aplicação.
      let applicationWhereClause = {
        studentId: req.session.user.id,
      };

      let jobConditionsForApplied = [];

      if (contractType) {
        jobConditionsForApplied.push({ contractType: contractType });
      }
      if (requirement) {
        jobConditionsForApplied.push({ requirements: { some: { name: requirement } } });
      }
      if (search) {
        jobConditionsForApplied.push({
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            { employer: { name: { contains: search } } },
            { requirements: { some: { name: { contains: search } } } }
          ]
        });
      }
      // O status da vaga não se aplica diretamente ao filtro "applied" aqui,
      // pois queremos ver todas as candidaturas, independentemente do status atual da vaga
      // a menos que o filtro "open" ou "closed" seja aplicado DENTRO das vagas aplicadas,
      // o que não está na lógica atual, mas é uma consideração futura.

      if (jobConditionsForApplied.length > 0) {
        applicationWhereClause.job = { AND: jobConditionsForApplied };
      }

      const myApplications = await prisma.jobApplication.findMany({
        where: applicationWhereClause,
        include: {
          job: {
            include: {
              employer: true,
              requirements: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });

      jobs = myApplications.map((app) => app.job);

      const totalApplications = await prisma.jobApplication.count({
        where: applicationWhereClause
      });
      totalJobs = totalApplications;

    } else { // Para estudantes (que não estão em 'applied') e usuários não logados
      // A finalWhereClause já contém as condições de status "open"/"closed" (se aplicáveis)
      // e os outros filtros.
      jobs = await prisma.job.findMany({
        where: finalWhereClause,
        include: {
          employer: true,
          requirements: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });
      totalJobs = await prisma.job.count({ where: finalWhereClause });
    }

    const totalPages = Math.ceil(totalJobs / limit);

    // Buscar todas as badges disponíveis para o filtro de requisitos
    const allBadges = await prisma.badge.findMany({
      orderBy: { name: "asc" },
    });

    res.render("jobsList", {
      jobs,
      error: null,
      isEmployer: isEmployer,
      isStudent: isStudent,
      user: req.session.user || null,
      filter: filter,
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
      search: search,
      contractType: contractType,
      requirement: requirement,
      availableRequirements: allBadges,
    });
  } catch (err) {
    console.error("Erro ao carregar vagas:", err);
    res.status(500).render("jobsList", {
      jobs: [],
      error: "Erro ao carregar vagas.",
      isEmployer: req.session.user && req.session.user.type.toLowerCase() === "employer",
      isStudent: req.session.user && req.session.user.type.toLowerCase() === "student",
      user: req.session.user || null,
      filter: req.query.filter || "open",
      currentPage: 1,
      totalPages: 1,
      limit: 10,
      search: '',
      contractType: '',
      requirement: '',
      availableRequirements: [],
    });
  }
};

export const renderJobDetails = async (req, res) => {
  const jobId = Number.parseInt(req.params.id);

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: true,
        requirements: true,
        applications: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).render("error", { error: "Vaga não encontrada." });
    }

    const isOwner = req.session.user.id === job.employerId;
    const isStudent = req.session.user.type.toLowerCase() === "student";
    const isAdmin = req.session.user.type.toLowerCase() === "admin";

    let hasApplied = false;
    let applicationStatus = "";
    let applicationId = null;

    if (isStudent) {
      const application = await prisma.jobApplication.findFirst({
        where: {
          jobId,
          studentId: req.session.user.id,
        },
      });

      if (application) {
        hasApplied = true;
        applicationStatus = application.status;
        applicationId = application.id;
      }
    }

    if (!isOwner && !isStudent && !isAdmin) {
      return res.redirect("/access-denied");
    }

    res.render("jobDetails", {
      job,
      isOwner,
      isStudent,
      isAdmin,
      hasApplied,
      applicationStatus,
      applicationId,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { error: "Erro ao carregar detalhes da vaga." });
  }
};

export const createJob = async (req, res) => {
  if (req.session.user.type.toLowerCase() !== "employer") {
    return res.status(403).json({ message: "Apenas empregadores podem criar vagas." });
  }

  const { title, description, contractType, requirements } = req.body;
  const employerId = req.session.user.id;

  try {
    const badges = await prisma.badge.findMany({
      where: {
        name: {
          in: requirements,
        },
      },
    });

    if (badges.length !== requirements.length) {
      return res.status(400).json({
        message: "Alguns requisitos não correspondem a habilidades válidas.",
      });
    }

    const employer = await prisma.user.findUnique({
      where: { id: employerId },
    });

    const job = await prisma.job.create({
      data: {
        title,
        description,
        contractType,
        employerId,
        requirements: {
          create: badges.map((badge) => ({
            name: badge.name,
            badgeId: badge.id,
          })),
        },
      },
      include: {
        employer: true,
        requirements: true,
      },
    });

    const matchingStudents = await prisma.user.findMany({
      where: {
        type: "student",
        badges: {
          some: {
            badge: {
              id: {
                in: badges.map((b) => b.id),
              },
            },
          },
        },
      },
      include: {
        badges: {
          include: {
            badge: true,
          },
        },
      },
    });

    const studentsWithMatchCount = matchingStudents.map((student) => {
      const matchingBadges = student.badges.filter((ub) => badges.some((b) => b.id === ub.badgeId));
      return {
        ...student,
        matchCount: matchingBadges.length,
      };
    });

    await notifyNewJob({ ...job, employer }, studentsWithMatchCount);

    res.status(201).json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar vaga.", error: err.message });
  }
};

export const updateJob = async (req, res) => {
  const jobId = Number.parseInt(req.params.id);
  const { title, description, contractType, requirements, status } = req.body;
  const employerId = req.session.user.id;

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ message: "Vaga não encontrada." });
    }

    if (job.employerId !== employerId) {
      return res.status(403).json({ message: "Você não tem permissão para editar esta vaga." });
    }

    let parsedRequirements = requirements;
    if (typeof requirements === "string") {
      try {
        parsedRequirements = JSON.parse(requirements);
      } catch (e) {
        console.error("Erro ao parsear requisitos:", e);
        return res.status(400).json({ message: "Formato de requisitos inválido." });
      }
    }

    const badges = await prisma.badge.findMany({
      where: {
        name: {
          in: parsedRequirements,
        },
      },
    });

    if (badges.length !== parsedRequirements.length) {
      return res.status(400).json({
        message: "Alguns requisitos não correspondem a habilidades válidas.",
      });
    }

    const jobStatus = status !== undefined ? status === "true" || status === true : job.status;

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        title,
        description,
        contractType,
        status: jobStatus,
        requirements: {
          deleteMany: {},
          create: badges.map((badge) => ({
            name: badge.name,
            badgeId: badge.id,
          })),
        },
      },
      include: {
        requirements: true,
      },
    });

    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.json(updatedJob);
    }

    res.redirect(`/jobs/${jobId}`);
  } catch (err) {
    console.error(err);

    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(500).json({ message: "Erro ao atualizar vaga.", error: err.message });
    }

    res.status(500).render("error", {
      error: "Erro ao atualizar vaga.",
      details: process.env.NODE_ENV === "development" ? err.message : null,
    });
  }
};

export const deleteJob = async (req, res) => {
  const jobId = Number.parseInt(req.params.id);
  const employerId = req.session.user.id;

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ message: "Vaga não encontrada." });
    }

    if (job.employerId !== employerId && req.session.user.type.toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Você não tem permissão para excluir esta vaga." });
    }

    await prisma.job.delete({
      where: { id: jobId },
    });

    res.json({ message: "Vaga excluída com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir vaga.", error: err.message });
  }
};

export const applyForJob = async (req, res) => {
  const jobId = Number.parseInt(req.params.id);
  const studentId = req.session.user.id;

  if (req.session.user.type.toLowerCase() !== "student") {
    return res.status(403).json({ message: "Apenas estudantes podem se candidatar a vagas." });
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        requirements: true,
      },
    });

    if (!job) {
      return res.status(404).json({ message: "Vaga não encontrada." });
    }

    if (job.status === false) {
      return res.status(400).json({ message: "Esta vaga não está mais aceitando candidaturas." });
    }

    const existingApplication = await prisma.jobApplication.findFirst({
      where: {
        jobId,
        studentId,
      },
    });

    if (existingApplication) {
      return res.status(400).json({ message: "Você já se candiditou a esta vaga." });
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        studentId,
        status: "PENDING",
      },
    });

    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });

    await notifyNewApplication(application, job, student);

    res.status(201).json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao se candidatar à vaga.", error: err.message });
  }
};

export const getJobApplications = async (req, res) => {
  const jobId = Number.parseInt(req.params.id);
  const userId = req.session.user.id;

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ message: "Vaga não encontrada." });
    }

    if (job.employerId !== userId && req.session.user.type.toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Você não tem permissão para ver as candidaturas desta vaga." });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { jobId },
      include: {
        student: true,
      },
    });

    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar candidaturas.", error: err.message });
  }
};

export const updateApplicationStatus = async (req, res) => {
  const applicationId = Number.parseInt(req.params.id);
  const { status } = req.body;
  const employerId = req.session.user.id;

  try {
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        student: true,
      },
    });

    if (!application) {
      return res.status(404).json({ message: "Candidatura não encontrada." });
    }

    if (application.job.employerId !== employerId) {
      return res.status(403).json({ message: "Você não tem permissão para atualizar esta candidatura." });
    }

    if (status !== "ACCEPTED" && status !== "REJECTED") {
      return res.status(400).json({ message: "Status inválido." });
    }

    const updatedApplication = await prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status },
    });

    const message =
      status === "ACCEPTED"
        ? `Sua candidatura para a vaga "${application.job.title}" foi aceita!`
        : `Sua candidatura para a vaga "${application.job.title}" foi recusada.`;

    const notification = await createNotification(
      application.studentId,
      message,
      "application_update",
      String(application.jobId)
    );
    await sendNotificationEmail(notification, application.student, { job: application.job, application: updatedApplication });

    res.json(updatedApplication);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar candidatura.", error: err.message });
  }
};

export const cancelApplication = async (req, res) => {
  const applicationId = Number.parseInt(req.params.id);
  const studentId = req.session.user.id;

  if (req.session.user.type.toLowerCase() !== "student") {
    return res.status(403).json({ message: "Apenas estudantes podem cancelar candidaturas." });
  }

  try {
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
      },
    });

    if (!application) {
      return res.status(404).json({ message: "Candidatura não encontrada." });
    }

    if (application.studentId !== studentId) {
      return res.status(403).json({ message: "Você não tem permissão para cancelar esta candidatura." });
    }

    await prisma.jobApplication.delete({
      where: { id: applicationId },
    });

    const employer = await prisma.user.findUnique({ where: { id: application.job.employerId } });
    const notification = await createNotification(
      application.job.employerId,
      `Um candidato cancelou sua candidatura para a vaga "${application.job.title}".`,
      "application_canceled",
      String(application.jobId)
    );
    await sendNotificationEmail(notification, employer, { job: application.job });

    res.json({ message: "Candidatura cancelada com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao cancelar candidatura.", error: err.message });
  }
};

export const revertApplicationStatus = async (req, res) => {
  const applicationId = Number.parseInt(req.params.id);
  const employerId = req.session.user.id;

  try {
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        student: true,
      },
    });

    if (!application) {
      return res.status(404).json({ message: "Candidatura não encontrada." });
    }

    if (application.job.employerId !== employerId) {
      return res.status(403).json({ message: "Você não tem permissão para atualizar esta candidatura." });
    }

    if (application.status !== "REJECTED") {
      return res.status(400).json({ message: "Apenas candidaturas recusadas podem ser revertidas." });
    }

    const updatedApplication = await prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: "PENDING" },
    });

    const notification = await createNotification(
      application.studentId,
      `Sua candidatura para a vaga "${application.job.title}" está sendo reconsiderada.`,
      "application_update",
      String(application.jobId)
    );
    await sendNotificationEmail(notification, application.student, { job: application.job, application: updatedApplication });

    res.json(updatedApplication);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao reverter status da candidatura.", error: err.message });
  }
};

export const closeJobApplications = async (req, res) => {
  const jobId = Number.parseInt(req.params.id);
  const employerId = req.session.user.id;

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).render("error", { error: "Vaga não encontrada." });
    }

    if (job.employerId !== employerId) {
      return res.redirect("/access-denied");
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { status: false },
    });

    res.redirect(`/jobs/${jobId}`);
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { error: "Erro ao encerrar candidaturas para a vaga." });
  }
};

export const reopenJobApplications = async (req, res) => {
  const jobId = Number.parseInt(req.params.id);
  const employerId = req.session.user.id;

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).render("error", { error: "Vaga não encontrada." });
    }

    if (job.employerId !== employerId) {
      return res.redirect("/access-denied");
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { status: true },
    });

    res.redirect(`/jobs/${jobId}`);
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { error: "Erro ao reabrir candidaturas para a vaga." });
  }
};