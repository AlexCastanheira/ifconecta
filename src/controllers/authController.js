// src/controllers/authController.js
import bcrypt from "bcrypt"
import crypto from "crypto"
import { sendEmail, emailTemplates } from "../services/emailService.js"
import prisma from "../config/prismaClient.js"

export const renderLogin = (req, res) => {
    res.render("login", { error: null })
}

export const renderRegister = (req, res) => {
    res.render("register", { error: null })
}

export const login = async (req, res) => {
    const { email, password } = req.body

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return res.render("login", { error: "E-mail ou senha incorretos." })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.render("login", { error: "E-mail ou senha incorretos." })
        }

        if (!user.status) {
            if (user.type.toLowerCase() === "student") {
                return res.render("login", {
                    error: "Sua conta ainda não foi ativada. Por favor, verifique seu e-mail para o link de confirmação.",
                })
            } else if (user.type.toLowerCase() === "employer") {
                return res.render("login", {
                    error: "Sua conta está aguardando aprovação de um administrador.",
                })
            }
            return res.render("login", {
                error: "Sua conta está inativa. Entre em contato com o suporte.",
            })
        }

        req.session.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            type: user.type,
            status: user.status,
        }

        if (user.type.toLowerCase() === "student") {
            res.redirect("/users/perfil-estudante")
        } else if (user.type.toLowerCase() === "employer") {
            res.redirect("/users/perfil-empregador")
        } else if (user.type.toLowerCase() === "admin") {
            res.redirect("/admin/dashboard")
        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.error(err)
        res.render("login", { error: "Erro ao fazer login. Tente novamente." })
    }
}

export const register = async (req, res) => {
    const { name, email, password, confirmPassword, type, cnpj } = req.body;

    try {
        if (password !== confirmPassword) {
            return res.render("register", { error: "As senhas não coincidem." });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.render("register", { error: "Este e-mail já está em uso." });
        }

        let social = null;
        let status = false;
        let resetToken = null;
        let resetTokenExpiry = null;

        if (type.toLowerCase() === "employer") {
            if (!cnpj) {
                return res.render("register", { error: "CNPJ é obrigatório para empregadores." });
            }

            const cnpjLimpo = cnpj.replace(/\D/g, '');

            if (cnpjLimpo.length !== 14) {
                return res.render("register", { error: "CNPJ inválido. Digite 14 dígitos." });
            }

            try {
                const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
                    }
                });

                console.log(`[DEBUG CNPJ] Status da resposta da BrasilAPI para ${cnpjLimpo}:`, response.status);
                console.log(`[DEBUG CNPJ] OK (response.ok):`, response.ok);
                console.log(`[DEBUG CNPJ] Headers Content-Type:`, response.headers.get('content-type'));

                if (!response.ok) {
                    let errorDetails = `Status: ${response.status}`;
                    try {
                        const errorJson = await response.json();
                        errorDetails = errorJson.message || JSON.stringify(errorJson);
                    } catch (jsonError) {
                        const rawBody = await response.text().catch(() => "Corpo da resposta vazio ou ilegível.");
                        errorDetails = `Corpo da resposta ilegível ou não JSON. Status: ${response.status}. Corpo: ${rawBody.substring(0, 100)}`; // Limita o log do corpo
                    }
                    console.error(`[DEBUG CNPJ] Erro na BrasilAPI para CNPJ ${cnpjLimpo}: ${errorDetails}`);
                    throw new Error(`Erro na validação do CNPJ: ${errorDetails}`);
                }

                let data;
                try {
                    data = await response.json();
                    console.log(`[DEBUG CNPJ] Dados JSON recebidos para ${cnpjLimpo}:`, data);
                } catch (jsonParseError) {
                    const rawBody = await response.text().catch(() => "Corpo da resposta vazio ou ilegível.");
                    console.error(`[DEBUG CNPJ] Erro ao parsear JSON da BrasilAPI para CNPJ ${cnpjLimpo}. Corpo Bruto:`, rawBody);
                    throw new Error("Erro ao processar resposta da BrasilAPI. Tente novamente.");
                }

                social = data.razao_social || data.nome || null;

            } catch (err) {
                return res.render("register", { error: err.message });
            }

        } else if (type.toLowerCase() === "student") {
            resetToken = crypto.randomBytes(32).toString("hex");
            resetTokenExpiry = new Date(Date.now() + 24 * 3600000);
        } else {
            status = true;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                type,
                status,
                social,
                resetToken,
                resetTokenExpiry,
            },
        });

        if (user.type.toLowerCase() === "student") {
            await sendEmail(user.email, "Confirme seu E-mail no IF Conecta", emailTemplates.emailConfirmation(resetToken, user.id, user.name));
            return res.render("registrationSuccess", { type: "student", email: user.email });
        } else if (user.type.toLowerCase() === "employer") {
            return res.render("registrationSuccess", { type: "employer" });
        } else {
            req.session.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                type: user.type,
                status: user.status,
            };
            res.redirect("/admin/dashboard");
        }

    } catch (err) {
        console.error("Erro no processo de registro (final catch):", err);
        res.render("register", { error: err.message || "Erro ao criar conta. Tente novamente." });
    }
};

export const renderRegistrationSuccess = (req, res) => {
    const { type, email } = req.query;
    res.render("registrationSuccess", { type, email });
};

export const confirmEmail = async (req, res) => {
    const { userId, token } = req.params;

    try {
        const user = await prisma.user.findFirst({
            where: {
                id: Number.parseInt(userId),
                type: "student",
                status: false,
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            return res.render("error", {
                error: "Link de confirmação de e-mail inválido ou expirado. Por favor, tente registrar-se novamente ou entre em contato com o suporte.",
            });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                status: true,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        req.session.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            type: user.type,
            status: true,
        };

        res.redirect("/users/perfil-estudante?success=Sua conta foi ativada com sucesso!");

    } catch (err) {
        console.error("Erro ao confirmar e-mail:", err);
        res.render("error", {
            error: "Ocorreu um erro ao confirmar seu e-mail. Tente novamente mais tarde.",
        });
    }
};


export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Erro ao fazer logout:", err)
        }
        res.redirect("/")
    })
}

export const renderForgotPassword = (req, res) => {
    res.render("forgotPassword", { error: null })
}

export const forgotPassword = async (req, res) => {
    const { email } = req.body

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return res.render("forgotPassword", { error: "E-mail não encontrado." })
        }

        if (!user.emailPasswordReset) {
            return res.render("forgotPassword", {
                error: "Este usuário optou por não receber e-mails de redefinição de senha. Entre em contato com o suporte.",
            })
        }

        const resetToken = crypto.randomBytes(32).toString("hex")
        const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hora

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        })

        await sendEmail(user.email, "Redefinição de Senha - IF Conecta", emailTemplates.passwordReset(resetToken, user.id))

        res.render("forgotPasswordSuccess")
    } catch (err) {
        console.error(err)
        res.render("forgotPassword", {
            error: "Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.",
        })
    }
}

export const renderResetPassword = async (req, res) => {
    const { userId, token } = req.params

    try {
        const user = await prisma.user.findFirst({
            where: {
                id: Number.parseInt(userId),
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        })

        if (!user) {
            return res.render("error", {
                error: "Link de redefinição de senha inválido ou expirado.",
            })
        }

        res.render("resetPassword", { userId, token, error: null })
    } catch (err) {
        console.error(err)
        res.render("error", {
            error: "Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.",
        })
    }
}

export const resetPassword = async (req, res) => {
    const { userId, token } = req.params
    const { password, confirmPassword } = req.body

    try {
        if (password !== confirmPassword) {
            return res.render("resetPassword", {
                userId,
                token,
                error: "As senhas não coincidem.",
            })
        }

        const user = await prisma.user.findFirst({
            where: {
                id: Number.parseInt(userId),
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        })

        if (!user) {
            return res.render("error", {
                error: "Link de redefinição de senha inválido ou expirado.",
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        })

        res.render("resetPasswordSuccess")
    } catch (err) {
        console.error(err)
        res.render("resetPassword", {
            userId,
            token,
            error: "Ocorreu um erro ao redefinir sua senha. Tente novamente mais tarde.",
        })
    }
}